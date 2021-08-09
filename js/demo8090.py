'''
Author: liubei
Date: 2021-08-04 17:48:54
LastEditTime: 2021-08-06 10:41:57
Description: 
'''
import asyncio
from tornado.web import Application, RequestHandler, StaticFileHandler
from tornado.ioloop import IOLoop


class SetCookieHandler(RequestHandler):
    async def get(self):
        self.set_header('Access-Control-Allow-Origin', 'http://localhost:8210')
        self.set_header('Access-Control-Allow-Credentials', 'true')
        c = self.get_argument('c', None)

        if c:
            self.set_header('Set-Cookie', c)

        self.write('ok')


def main():
    app = Application([
        ('/setcookie', SetCookieHandler),
        (r'/static/(.*)', StaticFileHandler, {"path": "./"}),
    ], debug = True)
    app.listen(8090)

    loop = IOLoop.current()
    loop.start()


if __name__ == '__main__':
    main()
