<?php

namespace Tests\Feature;

use App\Mail\OrderPlacedMail;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CheckoutTest extends TestCase
{
    use RefreshDatabase;

    private function details(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Ayesha Khan',
            'email' => 'ayesha@example.com',
            'phone' => '0300 1234567',
            'address' => 'House 12, Street 4, Gulberg III',
            'city' => 'Lahore',
        ], $overrides);
    }

    public function test_checkout_redirects_to_bag_when_empty(): void
    {
        $this->get(route('checkout.create'))->assertRedirect(route('cart.index'));
    }

    public function test_placing_an_order_saves_it_decrements_stock_emails_and_clears_bag(): void
    {
        Mail::fake();
        $product = Product::factory()->stock(10)->onSale(450)->create(['price' => 500]);
        $this->post(route('cart.store'), ['product_id' => $product->id, 'quantity' => 3]);

        $response = $this->post(route('checkout.store'), $this->details());

        $order = Order::with('items')->sole();
        $response->assertRedirect(route('checkout.success', $order));
        $this->assertSame(1350.0, $order->subtotal - $order->savings);
        $this->assertSame(1500.0, $order->total); // 1350 + 150 delivery
        $this->assertSame('03001234567', $order->phone);
        $this->assertSame(7, $product->fresh()->stock);
        $this->assertEmpty(session('cart.items', []));

        Mail::assertSent(OrderPlacedMail::class, fn ($mail) => $mail->hasTo('ayesha@example.com') && ! $mail->forTeam);
        Mail::assertSent(OrderPlacedMail::class, fn ($mail) => $mail->forTeam);

        // The guest who placed it can see the confirmation page.
        $this->get(route('checkout.success', $order))->assertOk();
    }

    public function test_confirmation_page_is_private_to_the_session_that_ordered(): void
    {
        Mail::fake();
        $product = Product::factory()->create();
        $this->post(route('cart.store'), ['product_id' => $product->id]);
        $this->post(route('checkout.store'), $this->details());
        $order = Order::sole();

        $this->flushSession();

        $this->get(route('checkout.success', $order))->assertNotFound();
    }

    public function test_prescription_medicine_requires_an_attached_prescription(): void
    {
        Mail::fake();
        Storage::fake('local');
        $product = Product::factory()->prescription()->create();
        $this->post(route('cart.store'), ['product_id' => $product->id]);

        $this->post(route('checkout.store'), $this->details())->assertSessionHasErrors('prescription');
        $this->assertSame(0, Order::count());
        $this->assertSame(50, $product->fresh()->stock);

        $this->post(route('checkout.store'), $this->details([
            'prescription' => UploadedFile::fake()->image('rx.jpg'),
        ]))->assertRedirect();

        $order = Order::with('prescription')->sole();
        $this->assertNotNull($order->prescription);
        Storage::disk('local')->assertExists($order->prescription->file_path);
    }

    public function test_order_fails_cleanly_when_stock_ran_out_after_adding_to_bag(): void
    {
        $product = Product::factory()->stock(5)->create();
        $this->post(route('cart.store'), ['product_id' => $product->id, 'quantity' => 5]);
        $product->update(['stock' => 2]);

        $this->post(route('checkout.store'), $this->details())->assertSessionHasErrors('cart');

        $this->assertSame(0, Order::count());
        $this->assertSame(2, $product->fresh()->stock);
    }

    public function test_checkout_validates_pakistani_mobile_numbers_and_city(): void
    {
        $product = Product::factory()->create();
        $this->post(route('cart.store'), ['product_id' => $product->id]);

        $this->post(route('checkout.store'), $this->details(['phone' => '12345', 'city' => 'Atlantis']))
            ->assertSessionHasErrors(['phone', 'city']);
    }

    public function test_order_tracking_requires_matching_email(): void
    {
        Mail::fake();
        $product = Product::factory()->create();
        $this->post(route('cart.store'), ['product_id' => $product->id]);
        $this->post(route('checkout.store'), $this->details());
        $order = Order::sole();

        $this->get(route('orders.track', ['number' => $order->number, 'email' => 'someone@else.com']))
            ->assertInertia(fn ($page) => $page->where('order', null)->where('notFound', true));

        $this->get(route('orders.track', ['number' => strtolower($order->number), 'email' => 'AYESHA@example.com']))
            ->assertInertia(fn ($page) => $page->where('order.number', $order->number));
    }
}
