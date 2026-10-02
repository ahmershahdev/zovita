<?php

namespace App\Http\Controllers\Admin;

use App\Enums\StaffRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Security\ActivityLog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Owner-only: who works in the admin panel and what they may do. Staff are existing customer
 * accounts promoted by e-mail; every change is written to the activity log, and the last owner
 * can never be demoted or removed (the panel can't lock itself out).
 */
class StaffController extends Controller
{
    public function index(): Response
    {
        $staff = User::whereNotNull('role')->orderByRaw("CASE role WHEN 'owner' THEN 0 WHEN 'pharmacist' THEN 1 ELSE 2 END")->orderBy('name')->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->staffRole()?->value,
                'role_label' => $u->staffRole()?->label(),
                'two_factor' => $u->hasTwoFactor(),
                'last_login_at' => $u->last_login_at?->toIso8601String(),
            ]);

        return Inertia::render('Admin/Staff', ['staff' => $staff, 'roles' => StaffRole::options()]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:120'],
            'role' => ['required', Rule::enum(StaffRole::class)],
        ]);
        $user = User::where('email', strtolower(trim($data['email'])))->first();
        if (! $user) {
            return back()->withErrors(['email' => 'No account uses that e-mail. Ask them to create a normal customer account first.']);
        }
        if ($user->staffRole()) {
            return back()->withErrors(['email' => "{$user->name} is already staff. Change their role in the list instead."]);
        }
        if ($user->isBanned()) {
            return back()->withErrors(['email' => 'That account is banned.']);
        }

        $role = StaffRole::from($data['role']);
        $user->setStaffRole($role);
        ActivityLog::record('admin.staff.added', "Made {$user->email} a {$role->label()}", $request->user(), ['user_id' => $user->id]);

        return back()->with('success', "{$user->name} is now a {$role->label()}. They sign in at /admin/login with their password and a code e-mailed to them.");
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $data = $request->validate(['role' => ['required', Rule::enum(StaffRole::class)]]);
        abort_unless($user->staffRole(), 404);
        $role = StaffRole::from($data['role']);

        return $this->guardLastOwner($user, $role, function () use ($request, $user, $role) {
            $user->setStaffRole($role);
            ActivityLog::record('admin.staff.role', "Changed {$user->email}'s role to {$role->label()}", $request->user(), ['user_id' => $user->id]);

            return back()->with('success', "{$user->name} is now a {$role->label()}.");
        });
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        abort_unless($user->staffRole(), 404);

        return $this->guardLastOwner($user, null, function () use ($request, $user) {
            $user->setStaffRole(null);
            DB::table('sessions')->where('user_id', $user->id)->delete(); // sign them out everywhere
            ActivityLog::record('admin.staff.removed', "Removed {$user->email} from staff", $request->user(), ['user_id' => $user->id]);

            return back()->with('success', "{$user->name} no longer has admin access.");
        });
    }

    /** Lost phone: the next staff sign-in asks them to set up two-step sign-in again. */
    public function resetTwoFactor(Request $request, User $user): RedirectResponse
    {
        abort_unless($user->staffRole(), 404);
        if ($user->is($request->user())) {
            return back()->with('error', 'You can\'t reset your own two-step sign-in. Ask another owner.');
        }
        $user->forceFill(['two_factor_secret' => null, 'two_factor_recovery_codes' => null, 'two_factor_confirmed_at' => null, 'two_factor_last_step' => null])->save();
        DB::table('sessions')->where('user_id', $user->id)->delete();
        ActivityLog::record('admin.staff.2fa_reset', "Reset two-step sign-in for {$user->email}", $request->user(), ['user_id' => $user->id]);

        return back()->with('success', "{$user->name} will get e-mailed sign-in codes until they set up an authenticator app again.");
    }

    private function guardLastOwner(User $user, ?StaffRole $next, callable $change): RedirectResponse
    {
        return DB::transaction(function () use ($user, $next, $change) {
            $owners = User::where('role', StaffRole::Owner->value)->lockForUpdate()->pluck('id');
            if ($user->staffRole() === StaffRole::Owner && $next !== StaffRole::Owner && $owners->count() <= 1) {
                return back()->with('error', 'There has to be at least one owner. Make someone else an owner first.');
            }

            return $change();
        });
    }
}
