@extends('errors.layout')

@section('codigo', '403')
@section('titulo', 'Aquí no puedes entrar')
@section('mensaje', 'Esta sección pide permisos que tu cuenta no tiene. Si crees que deberías verla, escríbenos.')

@section('acciones')
            <a href="{{ url('/') }}" class="boton">Ir al inicio</a>
            <a href="{{ route('dashboard') }}" class="boton-suave">Mi panel</a>
@endsection
