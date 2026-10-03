@extends('errors.layout')

@section('codigo', '419')
@section('titulo', 'Se venció la página')
@section('mensaje', 'Estuviste un rato sin moverte y por seguridad cerramos el formulario. Vuelve a entrar y lo intentas de nuevo; no se perdió nada de lo que ya estaba guardado.')

@section('acciones')
            <a href="{{ route('login') }}" class="boton">Volver a entrar</a>
@endsection
