FROM    node

COPY    build /srv/hashwick/
COPY    config.production.js /srv/hashwick/packrat/
RUN     cd /srv/hashwick && npm install --production

EXPOSE  8085
CMD     ["node", "/srv/hashwick/packrat/daemon.js"]
