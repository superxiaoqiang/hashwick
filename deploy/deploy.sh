#!/bin/bash

set -o errexit
set -o nounset
set -o pipefail

grunt build-webapp

website_host=js-hashwick

ssh root@$website_host 'mkdir -p ~/hashwick'
rsync -r ../deploy root@$website_host:~/hashwick/

ssh root@$website_host 'mkdir -p ~/hashwick/deploy/hashwick-packrat/build'
rsync -r ../{lib,package.json,packrat} root@$website_host:~/hashwick/deploy/hashwick-packrat/build/

ssh root@$website_host 'mkdir -p ~/hashwick/deploy/hashwick-appserver/build'
rsync -r ../{lib,package.json,out/hashwick-server} root@$website_host:~/hashwick/deploy/hashwick-appserver/build/

ssh root@$website_host 'mkdir -p ~/hashwick/deploy/hashwick-nginx/build'
rsync -r ../out/hashwick-server root@$website_host:~/hashwick/deploy/hashwick-nginx/build/

ssh root@$website_host <<\EOSH
    set -o errexit
    set -o nounset
    set -o pipefail

    cd ~/hashwick/deploy

    docker_ensure_removed() {
        docker stop "$@" 2>/dev/null || true
        docker rm -f "$@" 2>/dev/null || true
    }

    docker build -t hashwick-db ./hashwick-db
    docker_ensure_removed hashwick-db
    docker run -d \
        --name hashwick-db \
        --volume=/srv/hashwick-db:/var/lib/postgresql/data/ \
        hashwick-db
    sleep 5  # wait for postgres server to come up (yes sloppy I know)

    hashwick_db_ip=$(docker inspect hashwick-db | jq -r '.[0].NetworkSettings.IPAddress')
    hashwick_db_password=VvsePjIkjjANIuKUYndsbvrAODYJHzwT
    psql -h $hashwick_db_ip -U postgres <<EOSQL
        create database packrat;
        create user packrat with password '$hashwick_db_password';
        grant all privileges on database packrat to packrat;
EOSQL
    psql -h $hashwick_db_ip -U packrat packrat < ~/hashwick/deploy/hashwick-packrat/build/packrat/db/2013-11-03.sql

    docker build -t hashwick-packrat ./hashwick-packrat
    docker_ensure_removed hashwick-packrat
    docker run -d \
        --name hashwick-packrat \
        --link=hashwick-db:hashwick-db \
        -e HASHWICK_DB_PASSWORD=$hashwick_db_password \
        -p 8085:8085 \
        hashwick-packrat

    docker build -t hashwick-appserver ./hashwick-appserver
    docker_ensure_removed hashwick-appserver
    docker run -d \
        --name hashwick-appserver \
        hashwick-appserver

    docker build -t hashwick-nginx ./hashwick-nginx
    docker_ensure_removed hashwick-nginx
    docker run -d \
        --name hashwick-nginx \
        --link hashwick-appserver:hashwick-appserver \
        -p 80:80 \
        hashwick-nginx
EOSH
