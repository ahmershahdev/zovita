<?php

namespace App\Http\Controllers\Admin;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Ban;
use App\Models\Order;
use App\Models\ProductInteraction;
use App\Models\User;
use App\Models\UserActivity;
use App\Services\Security\ActivityLog;
use App\Services\Security\BanGuard;
use App\Support\UserAgent;
use App\Support\Username;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function __construct(private readonly BanGuard $bans) {}

    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('q'));
        $filter = $request->query('filter');
        $like = '%'.addcslashes($search, '%_\\').'%';

        $users = User::query()
            ->withCount('orders')
            ->withSum(['orders as spent' => fn ($q) => $q->where('status', '!=', OrderStatus::Cancelled)], 'total')
            ->when($search !== '', fn ($q) => $q->where(fn ($w) => $w->where('name', 'like', $like)->orWhere('email', 'like', $like)->orWhere('username', 'like', $like)->orWhere('phone', 'like', $like)))
            ->when($filter === 'banned', fn ($q) => $q->whereNotNull('banned_at'))
            ->when($filter === 'admins', fn ($q) => $q->where('is_admin', true))
            ->when($filter === 'active', fn ($q) => $q->where('last_seen_at', '>=', now()->subDay()))
            ->latest()
            ->paginate(20)
            ->withQueryString()
            ->through(fn (User $u) => $this->summary($u) + [
                'orders' => $u->orders_count,
                'spent' => round((float) $u->spent),
            ]);

        return Inertia::render('Admin/Users', ['users' => $users, 'filters' => ['q' => $search, 'filter' => $filter]]);
    }

    public function show(User $user): Response
    {
        $activities = UserActivity::where('user_id', $user->id);

        return Inertia::render('Admin/User', [
            'customer' => $this->summary($user) + [
                'phone' => $user->phone,
                'address' => $user->address,
                'lat' => $user->lat,
                'lng' => $user->lng,
                'last_login_ip' => $user->getAttributes()['last_login_ip'] ?? null,
                'last_login_at' => $user->last_login_at?->toIso8601String(),
            ],
            'stats' => [
                'orders' => $user->orders()->count(),
                'spent' => round((float) $user->orders()->where('status', '!=', OrderStatus::Cancelled)->sum('total')),
                'cancelled' => $user->orders()->where('status', OrderStatus::Cancelled)->count(),
                'prescriptions' => $user->prescriptions()->count(),
                'failed_logins_30d' => (clone $activities)->where('type', 'auth.failed')->where('created_at', '>=', now()->subDays(30))->count(),
                'devices' => (clone $activities)->whereNotNull('device')->distinct()->count('device'),
                'ips' => (clone $activities)->whereNotNull('ip')->distinct()->count('ip'),
            ],
            'activity' => (clone $activities)->latest('created_at')->paginate(25, ['*'], 'activity_page')->withQueryString()
                ->through(fn (UserActivity $a) => [
                    'id' => $a->id,
                    'type' => $a->type,
                    'description' => $a->description,
                    'at' => $a->created_at->toIso8601String(),
                    'ip' => $a->ip,
                    'browser' => UserAgent::describe($a->user_agent),
                ]),
            // Where they sign in from: each distinct IP + browser, newest first.
            'connections' => (clone $activities)->whereNotNull('ip')
                ->selectRaw('ip, user_agent, MAX(created_at) as last_seen, COUNT(*) as events')
                ->groupBy('ip', 'user_agent')->orderByDesc('last_seen')->limit(15)->get()
                ->map(fn ($r) => ['ip' => $r->ip, 'network' => BanGuard::network($r->ip), 'browser' => UserAgent::describe($r->user_agent), 'last_seen' => Carbon::parse($r->last_seen)->toIso8601String(), 'events' => (int) $r->events]),
            'orders' => $user->orders()->withCount('items')->latest()->limit(10)->get()->map(fn (Order $o) => $o->toSummary()),
            'interests' => ProductInteraction::with('product:id,name,slug')->where('user_id', $user->id)->orderByDesc('dwell_seconds')->limit(8)->get()
                ->filter(fn ($i) => $i->product)->map(fn ($i) => ['name' => $i->product->name, 'slug' => $i->product->slug, 'views' => $i->views, 'minutes' => round($i->dwell_seconds / 60, 1), 'bought' => $i->purchases])->values(),
            'bans' => Ban::with('creator:id,name', 'lifter:id,name')->withCount('identifiers')->where('user_id', $user->id)->latest()->get()->map(fn (Ban $b) => [
                'id' => $b->id,
                'severity' => $b->severity,
                'label' => $b->label(),
                'reason' => $b->reason,
                'created_at' => $b->created_at->toIso8601String(),
                'expires_at' => $b->expires_at?->toIso8601String(),
                'lifted_at' => $b->lifted_at?->toIso8601String(),
                'active' => $b->isActive(),
                'by' => $b->creator?->name,
                'lifted_by' => $b->lifter?->name,
                'identifiers' => $b->identifiers_count,
            ]),
            'preview' => collect(Ban::SEVERITIES)->mapWithKeys(fn ($s) => [$s => collect($this->bans->preview($user, $s))->map(fn ($v) => count($v))->all()])->all(),
            'durations' => BanGuard::DURATIONS,
        ]);
    }

    /** Ban with a chosen severity. Admins (including yourself) can't be banned. */
    public function ban(Request $request, User $user): RedirectResponse
    {
        $data = $request->validate([
            'severity' => ['required', Rule::in(Ban::SEVERITIES)],
            'duration' => ['nullable', 'required_if:severity,temporary', Rule::in([...array_keys(BanGuard::DURATIONS), 'custom'])],
            'until' => ['nullable', 'required_if:duration,custom', 'date', 'after:now', 'before:+5 years'],
            'reason' => ['required', 'string', 'min:3', 'max:500'],
        ]);
        if ($user->is($request->user()) || ($user->getAttributes()['is_admin'] ?? false)) {
            return back()->with('error', 'Staff accounts can’t be banned. Remove their admin access first.');
        }

        $ban = $this->bans->ban(
            $user,
            $data['severity'],
            strip_tags($data['reason']),
            $data['duration'] ?? null,
            ($data['duration'] ?? null) === 'custom' ? Carbon::parse($data['until']) : null,
            $request->user(),
        );
        ActivityLog::record('ban.issued', $ban->label().' issued by '.$request->user()->name.': '.$ban->reason, $user);

        return back()->with('success', "{$user->name} — {$ban->label()} applied.".($ban->expires_at ? ' Ends '.$ban->expires_at->format('j M Y, g:i A').'.' : ''));
    }

    public function unban(Request $request, User $user): RedirectResponse
    {
        $this->bans->lift($user, $request->user());
        ActivityLog::record('ban.lifted', 'Ban lifted by '.$request->user()->name, $user);

        return back()->with('success', "Ban lifted — {$user->name} can sign in again.");
    }

    /** Usernames are fixed for customers; only staff can change them. */
    public function username(Request $request, User $user): RedirectResponse
    {
        $data = $request->validate([
            'username' => ['required', 'string', 'lowercase', 'min:4', 'max:40', Rule::unique('users', 'username')->ignore($user->id)],
        ]);
        if (! Username::valid($data['username'])) {
            return back()->withErrors(['username' => 'Use 4–40 lowercase letters, numbers and single dashes, starting with a letter.']);
        }
        $old = $user->username;
        $user->forceFill(['username' => $data['username']])->save();
        ActivityLog::record('profile.username', "Username changed by staff from @{$old} to @{$data['username']}", $user);

        return back()->with('success', "Username changed to @{$data['username']}.");
    }

    private function summary(User $u): array
    {
        $active = $u->isBanned();

        return [
            'id' => $u->id,
            'name' => $u->name,
            'username' => $u->username,
            'email' => $u->email,
            'city' => $u->city,
            'avatar' => $u->avatarUrl(),
            'is_admin' => (bool) ($u->getAttributes()['is_admin'] ?? false),
            'banned' => $active,
            'banned_until' => $active ? $u->banned_until?->toIso8601String() : null,
            'ban_reason' => $active ? $u->ban_reason : null,
            'joined' => $u->created_at->toIso8601String(),
            'last_seen' => $u->last_seen_at?->toIso8601String(),
        ];
    }
}
