-- Run as lssgoo_admin (or another role with CREATEDB) on database.lssgoo.com.
-- lssgoo_backend cannot CREATE DATABASE by itself.

create database lssgoo_mailer
  owner lssgoo_backend
  encoding 'UTF8'
  template template0;