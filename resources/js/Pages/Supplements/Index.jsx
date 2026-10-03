import { useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Boxes, Check, Package2, Pencil, Plus, Trash2, Wallet, X } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    Aviso,
    Boton,
    Cabecera,
    Campo,
    Celda,
    Entrada,
    Fila,
    Lista,
    Metrica,
    Pagina,
    Tabla,
    Tarjeta,
    Vacio,
} from '@/Components/UI';

const UNIDADES = {
    unit: 'Unidades',
    meters: 'Metros',
};

export default function Index({ supplements, totalInvested }) {
    const { flash } = usePage().props;
    const [creando, setCreando] = useState(false);
    const [editando, setEditando] = useState(null);

    const unidadesTotales = supplements.reduce((total, item) => total + Number(item.stock || 0), 0);

    const eliminar = (suplemento) => {
        if (window.confirm(`¿Eliminar "${suplemento.name}"? No se puede deshacer.`)) {
            router.delete(route('suplementos.destroy', suplemento.id), { preserveScroll: true });
        }
    };

    return (
        <AuthenticatedLayout header="Suplementos">
            <Head title="Suplementos" />

            <Pagina className="max-w-5xl">
                <Cabecera
                    titulo="Suplementos y materiales"
                    descripcion="Lo que gastas en empaque, bolsas, cintas y cajas. No aparece en tu catálogo, pero sí cuenta en tu inversión."
                >
                    <Boton onClick={() => setCreando((valor) => !valor)}>
                        <Plus className="h-4 w-4" />
                        Agregar
                    </Boton>
                </Cabecera>

                {flash?.success && <Aviso tono="exito">{flash.success}</Aviso>}

                <div className="grid gap-4 sm:grid-cols-3">
                    <Metrica etiqueta="Materiales distintos" valor={supplements.length} Icono={Boxes} />
                    <Metrica
                        etiqueta="Existencias"
                        valor={unidadesTotales.toLocaleString('es', { maximumFractionDigits: 2 })}
                        Icono={Package2}
                    />
                    <Metrica
                        etiqueta="Invertido"
                        valor={`$${Number(totalInvested).toFixed(2)}`}
                        detalle="Costo por lo comprado hasta hoy"
                        Icono={Wallet}
                        tono="marca"
                    />
                </div>

                {creando && <Formulario onListo={() => setCreando(false)} />}

                <Tarjeta cuerpo={false}>
                    {supplements.length === 0 ? (
                        <Vacio
                            Icono={Boxes}
                            titulo="Todavía no llevas materiales"
                            texto="Registra bolsas, cajas o cintas para que su costo entre en tu cálculo de ganancias."
                        >
                            <Boton onClick={() => setCreando(true)}>
                                <Plus className="h-4 w-4" />
                                Agregar el primero
                            </Boton>
                        </Vacio>
                    ) : (
                        <Tabla
                            encabezados={[
                                { texto: 'Material' },
                                { texto: 'Medida' },
                                { texto: 'Existencia', alineacion: 'text-right' },
                                { texto: 'Costo', alineacion: 'text-right' },
                                { texto: 'Invertido', alineacion: 'text-right' },
                                { texto: '' },
                            ]}
                        >
                            {supplements.map((suplemento) =>
                                editando === suplemento.id ? (
                                    <tr key={suplemento.id}>
                                        <td colSpan={6} className="p-4">
                                            <Formulario
                                                suplemento={suplemento}
                                                onListo={() => setEditando(null)}
                                                incrustado
                                            />
                                        </td>
                                    </tr>
                                ) : (
                                    <Fila key={suplemento.id}>
                                        <Celda etiqueta="Material">
                                            <span className="font-medium">{suplemento.name}</span>
                                        </Celda>

                                        <Celda etiqueta="Medida">
                                            <span className="text-stone-500 dark:text-stone-400">
                                                {UNIDADES[suplemento.type] ?? suplemento.type}
                                            </span>
                                        </Celda>

                                        <Celda etiqueta="Existencia" alineacion="sm:text-right">
                                            <span
                                                className={`tabular-nums ${
                                                    Number(suplemento.stock) <= 0
                                                        ? 'font-semibold text-red-600 dark:text-red-400'
                                                        : ''
                                                }`}
                                            >
                                                {Number(suplemento.stock).toLocaleString('es', {
                                                    maximumFractionDigits: 2,
                                                })}
                                            </span>
                                        </Celda>

                                        <Celda etiqueta="Costo" alineacion="sm:text-right">
                                            <span className="tabular-nums text-stone-500 dark:text-stone-400">
                                                ${Number(suplemento.cost_price ?? 0).toFixed(2)}
                                            </span>
                                        </Celda>

                                        <Celda etiqueta="Invertido" alineacion="sm:text-right">
                                            <span className="font-semibold tabular-nums">
                                                ${Number(suplemento.total_investment ?? 0).toFixed(2)}
                                            </span>
                                        </Celda>

                                        <Celda etiqueta="" alineacion="sm:text-right">
                                            <span className="flex justify-end gap-1">
                                                <Boton
                                                    variante="fantasma"
                                                    tamano="icono"
                                                    aria-label={`Editar ${suplemento.name}`}
                                                    onClick={() => setEditando(suplemento.id)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Boton>

                                                <Boton
                                                    variante="peligroSuave"
                                                    tamano="icono"
                                                    aria-label={`Eliminar ${suplemento.name}`}
                                                    onClick={() => eliminar(suplemento)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Boton>
                                            </span>
                                        </Celda>
                                    </Fila>
                                ),
                            )}
                        </Tabla>
                    )}
                </Tarjeta>
            </Pagina>
        </AuthenticatedLayout>
    );
}

function Formulario({ suplemento = null, onListo, incrustado = false }) {
    const esNuevo = suplemento === null;

    const form = useForm({
        name: suplemento?.name ?? '',
        type: suplemento?.type ?? 'unit',
        stock: suplemento?.stock ?? '',
        cost_price: suplemento?.cost_price ?? '',
    });

    const enviar = (evento) => {
        evento.preventDefault();

        const opciones = { preserveScroll: true, onSuccess: onListo };

        if (esNuevo) {
            form.post(route('suplementos.store'), opciones);
        } else {
            form.put(route('suplementos.update', suplemento.id), opciones);
        }
    };

    const contenido = (
        <form onSubmit={enviar} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Campo etiqueta="Nombre" error={form.errors.name} className="lg:col-span-2" requerido>
                    <Entrada
                        value={form.data.name}
                        onChange={(e) => form.setData('name', e.target.value)}
                        placeholder="Bolsas de regalo medianas"
                        required
                        autoFocus={esNuevo}
                    />
                </Campo>

                <Campo etiqueta="Se mide en" error={form.errors.type}>
                    <Lista value={form.data.type} onChange={(e) => form.setData('type', e.target.value)}>
                        <option value="unit">Unidades</option>
                        <option value="meters">Metros</option>
                    </Lista>
                </Campo>

                <Campo etiqueta="Existencia" error={form.errors.stock} requerido>
                    <Entrada
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        value={form.data.stock}
                        onChange={(e) => form.setData('stock', e.target.value)}
                        required
                    />
                </Campo>

                <Campo
                    etiqueta="Costo por unidad"
                    error={form.errors.cost_price}
                    ayuda="En dólares"
                    className="lg:col-span-2"
                >
                    <Entrada
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        value={form.data.cost_price}
                        onChange={(e) => form.setData('cost_price', e.target.value)}
                        placeholder="0.15"
                    />
                </Campo>
            </div>

            <div className="flex gap-2">
                <Boton type="submit" disabled={form.processing}>
                    <Check className="h-4 w-4" />
                    {form.processing ? 'Guardando' : esNuevo ? 'Agregar material' : 'Guardar cambios'}
                </Boton>

                <Boton variante="fantasma" onClick={onListo}>
                    <X className="h-4 w-4" />
                    Cancelar
                </Boton>
            </div>
        </form>
    );

    if (incrustado) {
        return (
            <div className="rounded-xl border border-stone-300 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-950">
                {contenido}
            </div>
        );
    }

    return (
        <Tarjeta titulo={esNuevo ? 'Nuevo material' : `Editar ${suplemento.name}`} className="animate-acercar">
            {contenido}
        </Tarjeta>
    );
}
