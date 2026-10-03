@extends('errors.layout')

@section('codigo', '404')
@section('titulo', 'Esta página no existe')
@section('mensaje', 'Puede que la dirección esté mal escrita, o que el catálogo que buscas ya no esté publicado.')

@section('acciones')
            <a href="{{ url('/') }}" class="boton">Ir al inicio</a>
            <a href="{{ route('login') }}" class="boton-suave">Entrar a mi panel</a>
@endsection
