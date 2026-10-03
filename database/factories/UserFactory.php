<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Por defecto se crea un comercio ya aprobado, que es el caso con el que
     * se prueba casi todo. Para los demás estados están los helpers de abajo.
     */
    public function definition(): array
    {
        $negocio = fake()->unique()->company();

        return [
            'name' => fake()->name(),
            'business_name' => $negocio,
            'username' => Str::slug($negocio) . '-' . Str::lower(Str::random(5)),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
            'role' => User::ROLE_TENANT,
            'status' => User::STATUS_APPROVED,
        ];
    }

    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    public function pendiente(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => User::STATUS_PENDING,
        ]);
    }

    public function suspendido(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => User::STATUS_SUSPENDED,
        ]);
    }

    public function admin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_APPROVED,
            'username' => null,
            'business_name' => null,
        ]);
    }
}
