<?php

use App\Http\Controllers\AccountStatusController;
use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\LandingNoticeController;
use App\Http\Controllers\Admin\PlanChangeRequestController as AdminPlanChangeRequestController;
use App\Http\Controllers\Admin\PlanController as AdminPlanController;
use App\Http\Controllers\Admin\PlatformSettingController;
use App\Http\Controllers\Admin\SecurityEventController;
use App\Http\Controllers\Admin\SuggestionController as AdminSuggestionController;
use App\Http\Controllers\Admin\TenantController;
use App\Http\Controllers\CatalogDesignController;
use App\Http\Controllers\CatalogoIaController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ComboController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DeliveryController;
use App\Http\Controllers\ExchangeRateController;
use App\Http\Controllers\ExportacionController;
use App\Http\Controllers\FacturaController;
use App\Http\Controllers\InvoiceTemplateController;
use App\Http\Controllers\LandingController;
use App\Http\Controllers\LegalController;
use App\Http\Controllers\PlanChangeRequestController;
use App\Http\Controllers\PrivatePhotoController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProfitController;
use App\Http\Controllers\RespaldoController;
use App\Http\Controllers\PublicCatalogController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\SuggestionController;
use App\Http\Controllers\SupplementController;
use Illuminate\Support\Facades\Route;

// ── Público ────────────────────────────────────────────────────────────────────

Route::get('/', [LandingController::class, 'index'])->name('home');
Route::get('/terminos', [LegalController::class, 'terminos'])->name('terminos');

// ── Cuenta pendiente de revisión ───────────────────────────────────────────────

Route::middleware('auth')->group(function () {
    Route::get('/cuenta/estado', [AccountStatusController::class, 'show'])->name('cuenta.estado');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// ── Panel del comercio ─────────────────────────────────────────────────────────

Route::middleware(['auth', 'verified', 'approved'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Personalización del catálogo público
    Route::prefix('catalogo')->name('catalogo.')->group(function () {
        Route::get('/personalizar', [CatalogDesignController::class, 'edit'])->name('personalizar');
        Route::put('/personalizar', [CatalogDesignController::class, 'update'])->name('personalizar.update');
        Route::get('/vista-previa', [PublicCatalogController::class, 'vistaPrevia'])->name('vista-previa');

        // Asistente de IA. El límite diario real lo lleva LimitesDeIa; el
        // throttle solo frena ráfagas antes de tocar la base de datos.
        Route::post('/ia/generar', [CatalogoIaController::class, 'generar'])
            ->middleware('throttle:6,1')
            ->name('ia.generar');
        Route::post('/ia/{generacion}/inventario', [CatalogoIaController::class, 'inventario'])
            ->middleware('throttle:10,1')
            ->name('ia.inventario');
        Route::post('/logo', [CatalogDesignController::class, 'uploadLogo'])->name('logo');
        Route::post('/logo/paleta', [CatalogDesignController::class, 'applyLogoPalette'])->name('logo.paleta');
        Route::post('/imagen/{tipo}', [CatalogDesignController::class, 'uploadImage'])->name('imagen');
        Route::delete('/imagen/{tipo}', [CatalogDesignController::class, 'destroyImage'])->name('imagen.destroy');
        Route::post('/publicar', [CatalogDesignController::class, 'togglePublish'])->name('publicar');

        Route::post('/banners', [CatalogDesignController::class, 'storeBanner'])->name('banners.store');
        Route::post('/banners/reordenar', [CatalogDesignController::class, 'reorderBanners'])->name('banners.reorder');
        Route::post('/banners/{banner}', [CatalogDesignController::class, 'updateBanner'])->name('banners.update');
        Route::delete('/banners/{banner}', [CatalogDesignController::class, 'destroyBanner'])->name('banners.destroy');

        Route::post('/modales', [CatalogDesignController::class, 'storeModal'])->name('modales.store');
        Route::post('/modales/{modal}', [CatalogDesignController::class, 'updateModal'])->name('modales.update');
        Route::delete('/modales/{modal}', [CatalogDesignController::class, 'destroyModal'])->name('modales.destroy');
    });

    // Copia de todo lo que el comercio tiene cargado
    Route::get('/mis-datos/descargar', [ExportacionController::class, 'descargar'])
        ->middleware('throttle:4,60')
        ->name('datos.descargar');

    // Respaldo del catálogo: se descarga y se puede volver a subir
    // Mi plan: lo que tiene contratado y cómo pedir otra cosa
    Route::get('/mi-plan', [PlanChangeRequestController::class, 'index'])->name('plan.index');
    Route::post('/mi-plan/solicitudes', [PlanChangeRequestController::class, 'store'])
        ->middleware('throttle:6,60')
        ->name('plan.solicitudes.store');
    Route::delete('/mi-plan/solicitudes/{solicitud}', [PlanChangeRequestController::class, 'destroy'])
        ->name('plan.solicitudes.destroy');

    Route::get('/respaldo', [RespaldoController::class, 'index'])->name('respaldo.index');
    Route::get('/respaldo/descargar', [RespaldoController::class, 'descargar'])
        ->middleware('throttle:6,60')
        ->name('respaldo.descargar');
    Route::post('/respaldo/subir', [RespaldoController::class, 'subir'])
        ->middleware('throttle:10,60')
        ->name('respaldo.subir');
    Route::post('/respaldo/restaurar', [RespaldoController::class, 'restaurar'])
        ->middleware('throttle:6,60')
        ->name('respaldo.restaurar');
    Route::post('/respaldo/cancelar', [RespaldoController::class, 'cancelar'])->name('respaldo.cancelar');
    Route::get('/respaldo/copias/{archivo}', [RespaldoController::class, 'descargarCopia'])->name('respaldo.copia');

    // Sugerencias y reportes de error hacia la plataforma
    Route::get('/sugerencias', [SuggestionController::class, 'index'])->name('sugerencias.index');
    Route::post('/sugerencias', [SuggestionController::class, 'store'])
        ->middleware('throttle:10,60')
        ->name('sugerencias.store');
    Route::delete('/sugerencias/{sugerencia}', [SuggestionController::class, 'destroy'])->name('sugerencias.destroy');

    // Tasas de cambio
    Route::get('/tasas/registrar', [ExchangeRateController::class, 'create'])->name('tasas.create');
    Route::post('/tasas/registrar', [ExchangeRateController::class, 'store'])->name('tasas.store');

    // Promociones y ajustes del comercio
    Route::get('/promociones', [SettingController::class, 'index'])->name('settings.index');
    Route::post('/promociones', [SettingController::class, 'update'])->name('settings.update');
    Route::post('/settings/banner', [SettingController::class, 'updateBanner'])->name('settings.banner');
    // Se cambia desde el formulario del producto, que es donde se escriben
    // los precios y donde se nota que el nombre no encaja.
    Route::post('/settings/nombre-del-precio', [SettingController::class, 'updateNombreDelPrecio'])
        ->name('settings.nombre-del-precio');

    // Inventario
    Route::resource('suplementos', SupplementController::class)->except(['create', 'show', 'edit']);

    Route::post('productos/reorder', [ProductController::class, 'reorder'])->name('productos.reorder');
    Route::get('productos/reordenar', [ProductController::class, 'reorderPage'])->name('productos.reorder-page');

    Route::patch('fichero-fotos/{foto}', [PrivatePhotoController::class, 'update'])->name('fichero-fotos.update');
    Route::delete('fichero-fotos/{foto}', [PrivatePhotoController::class, 'destroy'])->name('fichero-fotos.destroy');

    Route::resource('productos', ProductController::class);
    Route::delete('product-images/{id}', [ProductController::class, 'destroyImage'])->name('product-images.destroy');
    Route::delete('product-variants/{variant}', [ProductController::class, 'destroyVariant'])->name('product-variants.destroy');
    Route::patch('productos/{producto}/toggle-hidden', [ProductController::class, 'toggleHidden'])->name('productos.toggle-hidden');

    // Entró mercancía: se registra con su costo, no se escribe el stock a mano
    Route::post('productos/{producto}/reposicion', [ProductController::class, 'reponer'])->name('productos.reponer');

    Route::resource('combos', ComboController::class)->except(['create', 'show', 'edit']);
    Route::delete('combo-images/{id}', [ComboController::class, 'destroyImage'])->name('combo-images.destroy');
    Route::patch('combos/{combo}/toggle-hidden', [ComboController::class, 'toggleHidden'])->name('combos.toggle-hidden');

    Route::resource('categorias', CategoryController::class)->except(['create', 'show', 'edit']);

    // Facturación
    Route::get('facturas/plantilla', [InvoiceTemplateController::class, 'edit'])->name('facturas.plantilla');
    Route::put('facturas/plantilla', [InvoiceTemplateController::class, 'update'])->name('facturas.plantilla.update');
    Route::post('facturas/plantilla/imagen/{tipo}', [InvoiceTemplateController::class, 'uploadImage'])->name('facturas.plantilla.imagen');
    Route::delete('facturas/plantilla/imagen/{tipo}', [InvoiceTemplateController::class, 'destroyImage'])->name('facturas.plantilla.imagen.destroy');

    Route::resource('facturas', FacturaController::class);
    Route::post('facturas/{factura}/confirmar', [FacturaController::class, 'confirmar'])->name('facturas.confirmar');
    Route::patch('facturas/{factura}/toggle-variants-receipt', [FacturaController::class, 'toggleShowVariantsInReceipt'])->name('facturas.toggle-variants-receipt');

    // Ganancias y control de pérdidas
    Route::get('ganancias', [ProfitController::class, 'index'])->name('profits.index');
    Route::post('ganancias/ajustes', [ProfitController::class, 'storeAdjustment'])->name('profits.adjustments.store');
    Route::post('ganancias/productos/actualizar-financieros', [ProfitController::class, 'updateProductFinancials'])->name('profits.products.update-financials');

    // Libro de compras: de aquí sale la inversión de cada producto
    Route::get('ganancias/compras/{producto}', [ProfitController::class, 'compras'])->name('profits.compras');
    Route::post('ganancias/compras', [ProfitController::class, 'storePurchase'])->name('profits.compras.store');
    Route::delete('ganancias/compras/{compra}', [ProfitController::class, 'destroyPurchase'])->name('profits.compras.destroy');
    Route::post('ganancias/reset-start-date', [ProfitController::class, 'resetStartDate'])->name('profits.reset-start-date');

    // Entregas agendadas
    Route::get('entregas', [DeliveryController::class, 'index'])->name('deliveries.index');
    Route::post('entregas/{delivery}/posponer', [DeliveryController::class, 'postpone'])->name('deliveries.postpone');
});

// ── Administración de la plataforma ────────────────────────────────────────────

Route::middleware(['auth', 'admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', [AdminDashboardController::class, 'index'])->name('dashboard');

    Route::get('/comercios', [TenantController::class, 'index'])->name('comercios.index');
    Route::get('/comercios/{comercio}', [TenantController::class, 'show'])->name('comercios.show');
    Route::post('/comercios/{comercio}/aprobar', [TenantController::class, 'approve'])->name('comercios.aprobar');
    Route::post('/comercios/{comercio}/rechazar', [TenantController::class, 'reject'])->name('comercios.rechazar');
    Route::patch('/comercios/{comercio}/estado', [TenantController::class, 'updateStatus'])->name('comercios.estado');
    Route::patch('/comercios/{comercio}/plan', [TenantController::class, 'updatePlan'])->name('comercios.plan');
    Route::post('/comercios/{comercio}/prueba', [TenantController::class, 'trial'])->name('comercios.prueba');
    Route::post('/comercios/{comercio}/verificar-correo', [TenantController::class, 'verifyEmail'])->name('comercios.verificar-correo');
    Route::patch('/comercios/{comercio}/vitrina', [TenantController::class, 'showcase'])->name('comercios.vitrina');
    Route::post('/comercios/{comercio}/inspeccionar', [TenantController::class, 'inspect'])->name('comercios.inspeccionar');
    Route::post('/inspeccion/salir', [TenantController::class, 'stopInspecting'])->name('inspeccion.salir');

    // Cambios de plan que piden los comercios
    Route::get('/cambios-de-plan', [AdminPlanChangeRequestController::class, 'index'])->name('cambios-plan.index');
    Route::patch('/cambios-de-plan/{solicitud}', [AdminPlanChangeRequestController::class, 'update'])->name('cambios-plan.update');

    Route::get('/planes', [AdminPlanController::class, 'index'])->name('planes.index');
    Route::post('/planes', [AdminPlanController::class, 'store'])->name('planes.store');
    Route::post('/planes/reordenar', [AdminPlanController::class, 'reorder'])->name('planes.reorder');
    Route::put('/planes/{plan}', [AdminPlanController::class, 'update'])->name('planes.update');
    Route::delete('/planes/{plan}', [AdminPlanController::class, 'destroy'])->name('planes.destroy');

    // Sugerencias y errores que reportan los comercios
    Route::get('/sugerencias', [AdminSuggestionController::class, 'index'])->name('sugerencias.index');
    Route::patch('/sugerencias/{sugerencia}', [AdminSuggestionController::class, 'update'])->name('sugerencias.update');
    Route::delete('/sugerencias/{sugerencia}', [AdminSuggestionController::class, 'destroy'])->name('sugerencias.destroy');

    // Registro de seguridad
    Route::get('/seguridad', [SecurityEventController::class, 'index'])->name('seguridad.index');
    Route::patch('/seguridad/{evento}/revisar', [SecurityEventController::class, 'review'])->name('seguridad.revisar');
    Route::post('/seguridad/revisar-todo', [SecurityEventController::class, 'reviewAll'])->name('seguridad.revisar-todo');

    // Avisos flotantes de la portada
    Route::get('/avisos', [LandingNoticeController::class, 'index'])->name('avisos.index');
    Route::post('/avisos', [LandingNoticeController::class, 'store'])->name('avisos.store');
    Route::post('/avisos/reordenar', [LandingNoticeController::class, 'reorder'])->name('avisos.reorder');
    // POST y no PUT: el formulario lleva archivo y viaja como multipart
    Route::post('/avisos/{aviso}', [LandingNoticeController::class, 'update'])->name('avisos.update');
    Route::delete('/avisos/{aviso}', [LandingNoticeController::class, 'destroy'])->name('avisos.destroy');

    Route::get('/ajustes', [PlatformSettingController::class, 'edit'])->name('ajustes');
    Route::put('/ajustes', [PlatformSettingController::class, 'update'])->name('ajustes.update');
});

// ── API pública del catálogo ───────────────────────────────────────────────────

Route::get('/api/fetch-rates', [ExchangeRateController::class, 'fetchExternalRates'])->name('api.fetch-rates');

require __DIR__.'/auth.php';

// ── Catálogo público del comercio: siempre al final ────────────────────────────
// Cualquier ruta propia de la plataforma se declara arriba; lo que quede
// se interpreta como el nombre de usuario de un comercio.

Route::get('/{username}', [PublicCatalogController::class, 'show'])
    ->where('username', '[a-z0-9][a-z0-9-]*')
    ->name('catalogo.publico');
