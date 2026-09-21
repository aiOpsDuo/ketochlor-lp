#!/bin/sh
# Roda uma única vez, na primeira inicialização do volume `mysql-data` (a
# imagem oficial só executa scripts de /docker-entrypoint-initdb.d/ quando o
# diretório de dados está vazio — ver docs/BANCO-DE-DADOS.md quando a tarefa
# `migracao-mysql-documentacao` consolidar isso).
#
# Cria o usuário de aplicação com privilégio limitado ao CRUD do schema do
# CMS (SELECT/INSERT/UPDATE/DELETE/INDEX) — sem CREATE/ALTER/DROP em
# runtime. DDL fica a cargo do runner de migrations da tarefa
# `migracao-mysql-schema` (ainda não existe), que roda com credencial
# própria, nunca com esta.
#
# Não usamos as variáveis MYSQL_USER/MYSQL_PASSWORD da imagem oficial porque
# elas concedem GRANT ALL (equivalente a superusuário) no banco de
# MYSQL_DATABASE — privilégio bem maior do que o exigido aqui.
set -eu

mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" <<-SQL
	CREATE USER IF NOT EXISTS '${MYSQL_APP_USER}'@'%' IDENTIFIED BY '${MYSQL_APP_PASSWORD}';
	GRANT SELECT, INSERT, UPDATE, DELETE, INDEX ON \`${MYSQL_DATABASE}\`.* TO '${MYSQL_APP_USER}'@'%';
	FLUSH PRIVILEGES;
SQL
