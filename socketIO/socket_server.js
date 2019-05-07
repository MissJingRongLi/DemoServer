const ChatModel = require('../db/models').ChatModel
module.exports = function (server) {
    //// 得到 IO 对象
    const io = require('socket.io')(server)
    // 监视连接 ( 当有一个客户连接上时回调 )
    io.on('connection', function (socket) {
        console.log('有一个客户端连接上了服务器')
        // 绑定监听
        socket.on('sendMsg', function ({ From, To, content }) {
            console.log('客户端向服务器发送了消息 ---', { From, To, content })
            // 处理数据，向数据库中写入数据
            // 准备数据（chatMsg）
            const chat_id = [From, To].sort().join('_')
            const create_time = Date.now()
            new ChatModel({From, To, chat_id, content, create_time}).save(function(err, chatMsg){
                if(err){
                    console.log(err)
                }
                // 服务器向客户端发送消息 ( 名称 , 数据 )
                //这里使用io 来发，就会对所有连接在线的客户端发送（客户端收到后先判断再显示）
                io.emit('receiveMsg', chatMsg)
            })

            
            
            console.log(' 服务器向浏览器发送消息', { From, To, content })
        })
    })
}