<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Enums\PrescriptionStatus;
use App\Mail\PrescriptionDecisionMail;
use App\Models\Order;
use App\Models\Prescription;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AdminTest extends TestCase
{
    use RefreshDatabase;

    private function makeAdmin(): User
    {
        $user = User::factory()->create();
        $user->forceFill(['is_admin' => true])->save();

        return $user->fresh();
    }

    private function prescription(array $attrs = []): Prescription
    {
        return Prescription::create($attrs + [
            'reference' => Prescription::generateReference(),
            'name' => 'Ayesha Khan', 'email' => 'ayesha@example.com', 'phone' => '03001234567',
            'file_path' => 'prescriptions/x.png', 'original_name' => 'x.png', 'status' => PrescriptionStatus::Received,
        ]);
    }

    public function test_the_admin_panel_is_invisible_to_everyone_else(): void
    {
        // Guests and customers get a plain 404 — the panel isn't advertised.
        $this->get(route('admin.dashboard'))->assertNotFound();
        $this->actingAs(User::factory()->create())->get(route('admin.dashboard'))->assertNotFound();
        $this->actingAs($this->makeAdmin())->get(route('admin.dashboard'))->assertOk()->assertInertia(fn ($page) => $page->component('Admin/Dashboard'));
    }

    public function test_every_admin_page_renders(): void
    {
        $this->actingAs($this->makeAdmin());
        foreach (['admin.dashboard', 'admin.orders.index', 'admin.users.index', 'admin.prescriptions.index', 'admin.products.index'] as $name) {
            $this->get(route($name))->assertOk();
        }
    }

    public function test_banning_signs_the_user_out_and_blocks_sign_in(): void
    {
        $customer = User::factory()->create(['password' => 'secret-password']);
        $this->actingAs($this->makeAdmin())->post(route('admin.users.ban', $customer), ['severity' => 'permanent', 'reason' => 'Fraudulent prescriptions'])->assertSessionHas('success');
        $this->assertNotNull($customer->fresh()->banned_at);

        // A live session is ended on the next request…
        $this->actingAs($customer->fresh())->get(route('account.dashboard'))->assertRedirect(route('suspended'));
        $this->assertGuest();

        // …and the password no longer works.
        $this->post(route('login'), ['email' => $customer->email, 'password' => 'secret-password'])->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_admins_cannot_be_banned(): void
    {
        $admin = $this->makeAdmin();
        $this->actingAs($admin)->post(route('admin.users.ban', $admin), ['severity' => 'permanent', 'reason' => 'test'])->assertSessionHas('error');
        $this->assertNull($admin->fresh()->banned_at);
    }

    public function test_approving_a_prescription_confirms_its_order(): void
    {
        Mail::fake();
        $p = $this->prescription();
        $order = Order::create(['prescription_id' => $p->id, 'number' => 'ZV-T-1', 'status' => OrderStatus::Pending, 'customer_name' => 'A', 'email' => 'a@example.com', 'phone' => '1', 'address' => 'x', 'city' => 'Karachi', 'subtotal' => 100, 'total' => 100]);

        $this->actingAs($this->makeAdmin())->patch(route('admin.prescriptions.update', $p), ['status' => 'approved'])->assertSessionHas('success');

        $this->assertSame(PrescriptionStatus::Approved, $p->fresh()->status);
        $this->assertSame(OrderStatus::Confirmed, $order->fresh()->status);
        Mail::assertSent(PrescriptionDecisionMail::class);
    }

    public function test_rejecting_needs_a_reason_and_cancels_the_order_returning_stock(): void
    {
        Mail::fake();
        $product = Product::factory()->create(['stock' => 3]);
        $p = $this->prescription();
        $order = Order::create(['prescription_id' => $p->id, 'number' => 'ZV-T-2', 'status' => OrderStatus::Pending, 'customer_name' => 'A', 'email' => 'a@example.com', 'phone' => '1', 'address' => 'x', 'city' => 'Karachi', 'subtotal' => 100, 'total' => 100]);
        $order->items()->create(['product_id' => $product->id, 'name' => $product->name, 'slug' => $product->slug, 'unit_price' => 50, 'quantity' => 2, 'line_total' => 100]);
        $this->actingAs($this->makeAdmin());

        $this->patch(route('admin.prescriptions.update', $p), ['status' => 'rejected'])->assertSessionHasErrors('note');
        $this->patch(route('admin.prescriptions.update', $p), ['status' => 'rejected', 'note' => 'Expired prescription'])->assertSessionHas('success');

        $this->assertSame(PrescriptionStatus::Rejected, $p->fresh()->status);
        $this->assertSame(OrderStatus::Cancelled, $order->fresh()->status);
        $this->assertSame(5, $product->fresh()->stock);
    }

    public function test_undecided_prescriptions_are_approved_after_24_hours(): void
    {
        Mail::fake();
        $old = $this->prescription();
        $old->forceFill(['created_at' => now()->subHours(25)])->save();
        $fresh = $this->prescription();
        $rejected = $this->prescription(['status' => PrescriptionStatus::Rejected]);
        $rejected->forceFill(['created_at' => now()->subHours(30)])->save();

        $this->artisan('prescriptions:auto-approve')->assertSuccessful();

        $this->assertSame(PrescriptionStatus::Approved, $old->fresh()->status);
        $this->assertTrue($old->fresh()->auto_approved);
        $this->assertSame(PrescriptionStatus::Received, $fresh->fresh()->status);
        $this->assertSame(PrescriptionStatus::Rejected, $rejected->fresh()->status);
    }

    public function test_cancelling_an_order_restores_stock_once(): void
    {
        $product = Product::factory()->create(['stock' => 1]);
        $order = Order::create(['number' => 'ZV-T-3', 'status' => OrderStatus::Confirmed, 'customer_name' => 'A', 'email' => 'a@example.com', 'phone' => '1', 'address' => 'x', 'city' => 'Karachi', 'subtotal' => 100, 'total' => 100]);
        $order->items()->create(['product_id' => $product->id, 'name' => $product->name, 'slug' => $product->slug, 'unit_price' => 50, 'quantity' => 2, 'line_total' => 100]);
        $this->actingAs($this->makeAdmin());

        $this->patch(route('admin.orders.update', $order), ['status' => 'cancelled']);
        $this->patch(route('admin.orders.update', $order), ['status' => 'cancelled']);

        $this->assertSame(3, $product->fresh()->stock);
    }

    public function test_prescription_files_are_admin_only(): void
    {
        $p = $this->prescription();
        $this->actingAs(User::factory()->create())->get(route('admin.prescriptions.file', $p))->assertNotFound();
    }
}
