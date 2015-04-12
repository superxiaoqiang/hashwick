FROM    node

COPY    build /srv/hashwick/
COPY    config.production.js /srv/hashwick/hashwick-server/
RUN     cd /srv/hashwick && npm install --production

EXPOSE  801
CMD     ["node", "/srv/hashwick/hashwick-server/server.js"]
