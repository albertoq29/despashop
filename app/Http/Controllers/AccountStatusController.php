<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Pantalla que ve el comercio mientras su solicitud no esté aprobada.
 */
class AccountStatusController extends Controller
{
    public function show(Request $request): Response
    {
        $user = $request->user()->loadMissing('requestedPlan');

        return Inertia::render('Cuenta/Estado', [
            'cuenta' => [
                'name' => $user->name,
                'business_name' => $user->business_name,
                'username' => $user->username,
                'email' => $user->email,
                'status' => $user->status,
                'verificado' => $user->hasVerifiedEmail(),
                'rejection_reason' => $user->rejection_reason,
                'requested_plan' => $user->requestedPlan?->only(['id', 'name', 'price_usd']),
                'created_at' => $user->created_at,
                'reviewed_at' => $user->reviewed_at,
            ],
            'catalogUrl' => $user->catalogUrl(),
            'soporte' => [
                'email' => \App\Models\Setting::platform('support_email'),
                'whatsapp' => \App\Models\Setting::platform('support_whatsapp'),
            ],
        ]);
    }
}
