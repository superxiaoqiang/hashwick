FROM    node

COPY    build /srv/hashwick/
COPY    config.production.js /srv/hashwick/packrat/
RUN     cd /srv/hashwick && npm install --production && npm install -g pm2

EXPOSE  8085
CMD     ["pm2", "--no-daemon", "start", "/srv/hashwick/packrat/daemon.js"]
