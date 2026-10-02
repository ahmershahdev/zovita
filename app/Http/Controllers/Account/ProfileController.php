<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Http\Requests\Account\UpdateProfileRequest;
use App\Services\Security\ActivityLog;
use GdImage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    public function update(UpdateProfileRequest $request): RedirectResponse
    {
        $user = $request->user();
        $data = $request->safe()->except(['current_password']);
        $emailChanged = $data['email'] !== $user->email;

        $user->fill($data);
        $changed = array_keys($user->getDirty());
        $user->save();

        if ($changed) {
            ActivityLog::record('profile.updated', 'Updated profile: '.implode(', ', array_map(fn ($f) => str_replace('_', ' ', $f), $changed)));
        }
        if ($emailChanged) {
            ActivityLog::record('profile.email', 'Changed email address');
        }

        return back()->with('success', __('Profile updated.'));
    }

    public function password(Request $request): RedirectResponse
    {
        $validated = $request->validateWithBag('password', [
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);

        $request->user()->update(['password' => $validated['password']]);
        ActivityLog::record('profile.password', 'Changed password');

        return back()->with('success', __('Password changed.'));
    }

    /** Profile picture: any photo up to 3 MB, cropped to a centred square and stored as 320px WebP. */
    public function avatar(Request $request): RedirectResponse
    {
        $request->validate([
            'avatar' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:3072', 'dimensions:min_width=96,min_height=96,max_width=8000,max_height=8000'],
        ]);

        $source = @imagecreatefromstring((string) file_get_contents($request->file('avatar')->getRealPath()));
        if (! $source instanceof GdImage) {
            throw ValidationException::withMessages(['avatar' => __('That image could not be read. Try a JPG or PNG.')]);
        }

        // Centre-crop to a square, resize, re-encode (also strips any metadata or embedded payload).
        $w = imagesx($source);
        $h = imagesy($source);
        $side = min($w, $h);
        $size = 320;
        $canvas = imagecreatetruecolor($size, $size);
        imagecopyresampled($canvas, $source, 0, 0, intdiv($w - $side, 2), intdiv($h - $side, 2), $size, $size, $side, $side);
        ob_start();
        imagewebp($canvas, null, 82);
        $bytes = (string) ob_get_clean();
        imagedestroy($canvas);
        imagedestroy($source);

        $user = $request->user();
        $disk = Storage::disk('public');
        $path = 'avatars/'.$user->id.'-'.Str::lower(Str::random(12)).'.webp';
        $disk->put($path, $bytes);
        if ($old = $user->getAttributes()['avatar_path'] ?? null) {
            $disk->delete($old);
        }
        $user->forceFill(['avatar_path' => $path])->save();
        ActivityLog::record('profile.avatar', 'Changed profile picture');

        return back()->with('success', __('Profile picture updated.'));
    }

    public function removeAvatar(Request $request): RedirectResponse
    {
        $user = $request->user();
        if ($old = $user->getAttributes()['avatar_path'] ?? null) {
            Storage::disk('public')->delete($old);
            $user->forceFill(['avatar_path' => null])->save();
            ActivityLog::record('profile.avatar', 'Removed profile picture');
        }

        return back()->with('success', __('Profile picture removed.'));
    }
}
