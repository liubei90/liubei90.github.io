'''
Author: liubei
Date: 2021-08-04 17:48:54
LastEditTime: 2021-08-18 14:34:11
Description: 
'''
import asyncio
from tornado.web import Application, RequestHandler, StaticFileHandler
from tornado.ioloop import IOLoop


class AsyncHandler(RequestHandler):
    async def get(self):
        timeout = self.get_argument('timeout', None)

        if timeout:
            await asyncio.sleep(int(timeout))

        self.set_header('Content-Type', 'text/javascript')
        self.write('''
        console.log("hello, async");
        //var count = 0;
        //for(var i = 0; i < 1000000000; i++) {
        //    count += 1;
        //}
        //console.log(count);
        ''')
        print('hello, async')


class DeferHandler(RequestHandler):
    async def get(self):
        timeout = self.get_argument('timeout', None)

        if timeout:
            await asyncio.sleep(int(timeout))

        self.set_header('Content-Type', 'text/javascript')
        self.write('console.log("hello, defer");')
        print('hello, defer')


class TimeoutPngHandler(RequestHandler):
    async def get(self):
        # print('timeout png')
        # await asyncio.sleep(20)
        # self.set_status(404)

        # await asyncio.sleep(20)

        with open('./1x1.png', mode='rb') as f:
            self.set_header('Content-Type', 'image/png')
            self.write(f.read())


def main():
    app = Application([
        ('/async.js', AsyncHandler),
        ('/defer.js', DeferHandler),
        ('/timeout.png', TimeoutPngHandler),
        (r'/static/(.*)', StaticFileHandler, {"path": "./"}),
    ], debug = True)
    app.listen(8090)

    loop = IOLoop.current()
    loop.start()


if __name__ == '__main__':
    main()
