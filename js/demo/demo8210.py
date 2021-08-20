'''
Author: liubei
Date: 2021-08-04 17:48:54
LastEditTime: 2021-08-06 09:37:31
Description: 
'''
import asyncio
from tornado.web import Application, RequestHandler, StaticFileHandler
from tornado.ioloop import IOLoop


class DemoHandler(RequestHandler):
    async def get(self):
        # self.set_status(400)
        # self.set_header('Access-Control-Allow-Origin', 'http://localhost:8100')
        # self.set_header('Access-Control-Allow-Credentials', 'true')
        self.write('第一次输出')
        self.flush()

        await asyncio.sleep(2)
        self.write('延迟2秒后的输出')
        self.flush()

        await asyncio.sleep(2)
        self.write('延迟4秒后的输出')


def main():
    app = Application([
        ('/demo', DemoHandler),
        # (r'/static/(.*)', StaticFileHandler, {"path": "C:\\Users\\10210\\github\\liubei\\liubei90.github.io\\js"}),
        (r'/static/(.*)', StaticFileHandler, {"path": "./"}),
    ], debug = True)
    app.listen(8210)

    loop = IOLoop.current()
    loop.start()


if __name__ == '__main__':
    main()
