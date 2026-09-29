<?php

namespace Tests\Feature;

use App\Mail\ContactMessageMail;
use App\Mail\PrescriptionMail;
use App\Models\ContactMessage;
use App\Models\Prescription;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FormsAndRecaptchaTest extends TestCase
{
    use RefreshDatabase;

    private array $contact = [
        'name' => 'Sara',
        'email' => 'sara@example.com',
        'topic' => 'Product question',
        'message' => 'Is this sunscreen suitable for sensitive, acne-prone skin?',
    ];

    private function enableRecaptcha(): void
    {
        config([
            'services.recaptcha.enabled' => true,
            'services.recaptcha.v3.site_key' => 'site-v3',
            'services.recaptcha.v3.secret_key' => 'secret-v3',
            'services.recaptcha.v2.site_key' => 'site-v2',
            'services.recaptcha.v2.secret_key' => 'secret-v2',
        ]);
    }

    public function test_contact_form_stores_message_and_emails_team_and_customer(): void
    {
        Mail::fake();

        $this->post(route('contact.store'), $this->contact)->assertSessionHas('success');

        $this->assertSame(1, ContactMessage::count());
        Mail::assertSent(ContactMessageMail::class, 2);
    }

    public function test_contact_honeypot_blocks_bots(): void
    {
        $this->post(route('contact.store'), $this->contact + ['website' => 'http://spam.test'])->assertSessionHasErrors('website');
        $this->assertSame(0, ContactMessage::count());
    }

    public function test_v3_rejects_low_scores_and_wrong_actions(): void
    {
        $this->enableRecaptcha();

        Http::fake(['*' => Http::response(['success' => true, 'score' => 0.2, 'action' => 'contact'])]);
        $this->post(route('contact.store'), $this->contact + ['recaptcha_token' => 't'])->assertSessionHasErrors('recaptcha_token');

        Http::fake(['*' => Http::response(['success' => true, 'score' => 0.9, 'action' => 'login'])]);
        $this->post(route('contact.store'), $this->contact + ['recaptcha_token' => 't'])->assertSessionHasErrors('recaptcha_token');

        $this->assertSame(0, ContactMessage::count());
    }

    public function test_v3_accepts_a_good_score_for_the_expected_action(): void
    {
        Mail::fake();
        $this->enableRecaptcha();
        Http::fake(['*' => Http::response(['success' => true, 'score' => 0.9, 'action' => 'contact'])]);

        $this->post(route('contact.store'), $this->contact + ['recaptcha_token' => 't'])->assertSessionHasNoErrors();

        Http::assertSent(fn ($request) => $request['secret'] === 'secret-v3' && $request['response'] === 't');
    }

    public function test_missing_token_fails_when_recaptcha_is_enabled(): void
    {
        $this->enableRecaptcha();
        Http::fake();

        $this->post(route('contact.store'), $this->contact)->assertSessionHasErrors('recaptcha_token');
        Http::assertNothingSent();
    }

    public function test_prescription_upload_uses_v2_and_stores_file_privately(): void
    {
        Mail::fake();
        Storage::fake('local');
        $this->enableRecaptcha();
        Http::fake(['*' => Http::response(['success' => true])]);

        $this->post(route('prescriptions.store'), [
            'name' => 'Usman',
            'email' => 'usman@example.com',
            'phone' => '+92 321 7654321',
            'file' => UploadedFile::fake()->create('rx.pdf', 200, 'application/pdf'),
            'consent' => '1',
            'recaptcha_token' => 'v2-token',
        ])->assertSessionHas('success');

        $prescription = Prescription::sole();
        Storage::disk('local')->assertExists($prescription->file_path);
        $this->assertStringStartsWith('prescriptions/', $prescription->file_path);
        Http::assertSent(fn ($request) => $request['secret'] === 'secret-v2');
        Mail::assertSent(PrescriptionMail::class, 2);
    }

    public function test_prescription_upload_rejects_executables(): void
    {
        Storage::fake('local');

        $this->post(route('prescriptions.store'), [
            'name' => 'Usman',
            'email' => 'usman@example.com',
            'phone' => '03217654321',
            'file' => UploadedFile::fake()->create('rx.php', 10, 'application/x-php'),
            'consent' => '1',
        ])->assertSessionHasErrors('file');
    }
}
