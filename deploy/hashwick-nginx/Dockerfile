# Dockerfile for openresty
# VERSION   0.0.4

FROM ubuntu:14.04
MAINTAINER Tor Hveem <tor@hveem.no>
ENV REFRESHED_AT 2014-08-08

ENV    DEBIAN_FRONTEND noninteractive
RUN    apt-get -y update && apt-get -y install wget libpq-dev

# Openresty (Nginx)
RUN    apt-get -y build-dep nginx \
  && apt-get -q -y clean && rm -rf /var/cache/apt/archives/* /var/lib/apt/lists/*
RUN    wget http://openresty.org/download/ngx_openresty-1.7.7.1.tar.gz \
  && tar xvfz ngx_openresty-1.7.7.1.tar.gz \
  && cd ngx_openresty-1.7.7.1 \
  && ./configure --with-luajit  --with-http_addition_module --with-http_dav_module --with-http_geoip_module --with-http_gzip_static_module --with-http_image_filter_module --with-http_realip_module --with-http_stub_status_module --with-http_ssl_module --with-http_sub_module --with-http_xslt_module --with-ipv6 --with-http_postgres_module --with-pcre-jit \
  && make \
  && make install \
  && rm -rf /ngx_openresty*

COPY    build /srv/hashwick/
COPY   ./nginx.conf /usr/local/openresty/nginx/conf/nginx.conf
EXPOSE 80
CMD    /usr/local/openresty/nginx/sbin/nginx
