module.exports = function (server) {
    //// 得到 IO 对象
    const io = require('socket.io')(server)
    // 监视连接 ( 当有一个客户连接上时回调 )
    io.on('connection', function (socket) {
        console.log('有一个客户端连接上了服务器')
        socket.on('sendMsg', function (data) {
            console.log('客户端向服务器发送了消息 ---', data)
            // 服务器向客户端发送消息 ( 名称 , 数据 )
            io.emit('receiveMsg', data.name + '_' + data.date)
            console.log(' 服务器向浏览器发送消息', data)
        })
    })
}