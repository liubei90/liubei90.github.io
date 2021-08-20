'''
Author: liubei
Date: 2021-08-09 14:15:28
LastEditTime: 2021-08-09 15:28:55
Description: 
'''
import asyncio
from tornado.web import Application, RequestHandler, StaticFileHandler
from tornado.ioloop import IOLoop


class HtmlHandler(RequestHandler):
    async def get(self):
        self.set_header('Content-Type', 'text/html')
        # self.set_header('Content-Type', 'text/plain')
        with open('./mime_demo.html', encoding='utf8') as f:
            self.write(f.read())


class CssHandler(RequestHandler):
    async def get(self):
        self.set_header('Content-Type', 'text/css')
        # self.set_header('Content-Type', 'text/plain')
        # self.set_header('X-Content-Type-Options', 'nosniff')
        with open('./mime_demo.css', encoding='utf8') as f:
            self.write(f.read())


class JsHandler(RequestHandler):
    async def get(self):
        self.set_header('Content-Type', 'text/javascript')
        self.set_header('Content-Type', 'text/plain')
        # self.set_header('Content-Type', 'text/typescript')
        self.set_header('X-Content-Type-Options', 'nosniff')
        with open('./mime_demo.js', encoding='utf8') as f:
            self.write(f.read())


class PngHandler(RequestHandler):
    async def get(self):
        self.set_header('Content-Type', 'image/png')
        # self.set_header('Content-Type', 'image/jpeg')
        with open('../images/Error.png', mode='rb') as f:
            self.write(f.read())


class JpgHandler(RequestHandler):
    async def get(self):
        # self.set_header('Content-Type', 'image/png')
        self.set_header('Content-Type', 'image/webp')
        # self.set_header('X-Content-Type-Options', 'nosniff')

        with open('../images/Error.png', mode='rb') as f:
            self.write(f.read())


def main():
    app = Application([
        ('/index.html', HtmlHandler),
        ('/index.css', CssHandler),
        ('/index.js', JsHandler),
        ('/index.png', PngHandler),
        ('/index.jpg', JpgHandler),
        (r'/static/(.*)', StaticFileHandler, {"path": "./"}),
    ], debug = True)
    app.listen(8090)

    loop = IOLoop.current()
    loop.start()


if __name__ == '__main__':
    main()
