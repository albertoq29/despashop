@extends('errors.layout')

@section('codigo', '429')
@section('titulo', 'Demasiados intentos')
@section('mensaje', 'Recibimos muchas peticiones seguidas desde tu conexión. Espera un minuto y vuelve a intentarlo.')

@section('acciones')
            <a href="{{ url('/') }}" class="boton">Ir al inicio</a>
@endsection
