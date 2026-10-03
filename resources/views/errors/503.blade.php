@extends('errors.layout')

@section('codigo', '503')
@section('titulo', 'Estamos en mantenimiento')
@section('mensaje', 'Volvemos en unos minutos. Estamos actualizando la plataforma para que funcione mejor.')

@section('acciones')
            <a href="{{ url('/') }}" class="boton">Reintentar</a>
@endsection
