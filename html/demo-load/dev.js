/*
 * @Author: liubei
 * @Date: 2021-12-31 16:58:22
 * @LastEditTime: 2022-01-01 20:28:10
 * @Description: 
 */
const sirv = require('sirv');
const polka = require('polka');
const bodyParser = require('body-parser');
const express = require('express');
const expressWs = require('express-ws');
const http = require('http');


const example = sirv('./example', {
    dev: true,
});

const analysis = sirv('./analysis', {
    dev: true,
});

let entries = []
const wsMap = {}
const app = express()
const server = http.createServer(app)

expressWs(app, server)


app.ws('/ws/:wid', (ws, req) => {
    const wid = req.params.wid

    console.log('wid:', wid)

    if (!wsMap[wid]) {
        wsMap[wid] = []
    }

    wsMap[wid].push(ws)

    ws.onclose = () => {
        wsMap[wid] = wsMap[wid].filter(item => item != ws)
    }
})

app.use(bodyParser.json())
    .use('/entries', (req, res, next) => {
        // console.log(req.body)

        if (!Array.isArray(req.body)) {
            res.statusCode = 400
            res.end('failled')
            return
        }


        entries = req.body
        res.end('success')

        if (wsMap[1] && wsMap[1].length) {
            wsMap[1].forEach((ws) => {
                ws.send(JSON.stringify({ type: 'entries', entries }))
            })
        }
    })
    .use('/timeout-style.css', (req, res, next) => {
        const { timeout = 0 } = req.query
        const cssStr = `
                .timeout {
                    display: none;
                }
            `

        if (timeout) {
            setTimeout(() => {
                res.type('css')
                res.end(cssStr)
            }, Number(timeout) * 1000)
            return
        }

        res.type('css')
        res.end(cssStr)
    })
    .use('/timeout-script.js', (req, res, next) => {
        const { timeout = 0 } = req.query
        const jsStr = `
        (function timeoutScript() {
            console.log('timeout ${timeout}');
        })()
            `

        if (timeout) {
            setTimeout(() => {
                res.type('js')
                res.end(jsStr)
            }, Number(timeout) * 1000)
            return
        }

        res.type('js')
        res.end(jsStr)
    })
    .use('/analysis', analysis)
    .use(example)

server.listen(5000, err => {
    if (err) throw err;
    console.log('> Ready on localhost:5000~!');
});