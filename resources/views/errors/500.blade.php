@extends('errors.layout')

@section('codigo', '500')
@section('titulo', 'Algo se rompió de nuestro lado')
@section('mensaje', 'No es culpa tuya. Ya quedó registrado y lo vamos a revisar. Intenta de nuevo en un momento.')

@section('acciones')
            <a href="{{ url('/') }}" class="boton">Ir al inicio</a>
@endsection
