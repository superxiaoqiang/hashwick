mkdir -p browserify
curl -L https://github.com/borisyankov/DefinitelyTyped/raw/master/browserify/browserify.d.ts > browserify/browserify.d.ts
mkdir -p d3
curl -L https://github.com/borisyankov/DefinitelyTyped/raw/master/d3/d3.d.ts > d3/d3.d.ts
mkdir -p express
curl -L https://github.com/borisyankov/DefinitelyTyped/raw/master/express/express.d.ts > express/express.d.ts
mkdir -p jquery
curl -L https://github.com/borisyankov/DefinitelyTyped/raw/master/jquery/jquery.d.ts > jquery/jquery.d.ts
mkdir -p node
curl -L https://github.com/borisyankov/DefinitelyTyped/raw/master/node/node.d.ts > node/node.d.ts
mkdir -p q
curl -L https://github.com/borisyankov/DefinitelyTyped/raw/master/q/Q.d.ts > q/Q.d.ts
mkdir -p socket.io
curl -L https://github.com/borisyankov/DefinitelyTyped/raw/master/socket.io/socket.io.d.ts > socket.io/socket.io.d.ts
mkdir -p underscore
curl -L https://github.com/borisyankov/DefinitelyTyped/raw/master/underscore/underscore.d.ts > underscore/underscore.d.ts
mkdir -p when
curl -L https://github.com/borisyankov/DefinitelyTyped/raw/master/when/when.d.ts > when/when.d.ts
mkdir -p zepto
curl -L https://github.com/borisyankov/DefinitelyTyped/raw/master/zepto/zepto.d.ts > zepto/zepto.d.ts


mkdir -p bootstrap-stylus
git clone https://github.com/Acquisio/bootstrap-stylus.git /tmp/bootstrap-stylus
git --git-dir=/tmp/bootstrap-stylus/.git archive 3.0.0-r1 stylus | tar x -C bootstrap-stylus --strip=1
rm -rf /tmp/bootstrap-stylus
