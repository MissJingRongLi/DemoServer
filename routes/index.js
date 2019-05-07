var express = require('express');
var router = express.Router();
// 引入 md5 加密函数库
var md5 = require('blueimp-md5')
// 引入 UserModel
var UserModel = require('../db/models').UserModel
var ChatModel = require('../db/models').ChatModel

const filter = { password: 0, __v: 0 } // 查询时过滤出指定的属性
/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

/* 
提供一个用户注册的接口
a) path 为: /register
b) 请求方式为: POST
c) 接收 username 和 password 参数
d) admin 是已注册用户
e) 注册成功返回: {code: 0, data: {_id: 'abc', username: ‘xxx’, password:’123’}
f) 注册失败返回: {code: 1, msg: '此用户已存在'}
*/
router.post('/register', function (req, res) {
  // 1. 获取请求参数数据 (username, password, type)
  const { username, password, type } = req.body
  // 2. 处理数据
  // 2.1. 根据 username 查询数据库 , 看是否已存在 user
  UserModel.findOne({ username }, function (err, userDoc) {
    // 3.1. 如果存在 , 返回一个提示响应数据 : 此用户已存在
    if (userDoc) {
      res.send({
        code: 1,
        msg: '用户已存在'
      })
    } else {// 2.2. 如果不存在 , 将提交的 user 保存到数据库
      userModel = new UserModel({
        username,
        type,
        password: md5(password)
      })
      userModel.save(function (err, userDoc) {
        // 生成一个 cookie(userid: user._id), 并交给浏览器保存
        res.cookie('userid', userDoc._id, { maxAge: 1000 * 60 * 60 })
        // 持久化 cookie, 浏览器会保存在本地文件
        // 3.2. 保存成功 , 返回成功的响应数据 : user
        res.send({
          code: 0,
          data: {
            _id: userDoc._id,
            username,
            type
          }
        })
      })
    }
  })
})

// 登陆路由
router.post('/login', function (req, res) {
  // 1. 获取请求参数数据 (username, password)
  const { username, password } = req.body
  // 2. 处理数据 : 根据 username 和 password 去数据库查询得到 user
  UserModel.findOne({ username, password: md5(password) }, filter, function (err, userDoc) {
    // 3. 返回响应数据
    console.log(0)
    // 3.1. 如果 user 没有值 , 返回一个错误的提示 : 用户名或密码错误
    if (!userDoc) {
      res.send({
        code: 1,
        msg: '用户名或密码错误'
      })
    } else {
      // 生成一个 cookie(userid: user._id), 并交给浏览器保存
      res.cookie('userid', userDoc._id, { maxAge: 1000 * 60 * 60 })
      // 3.2. 如果 user 有值 , 返回 user
      res.send({
        code: 0,
        data: userDoc
      })
    }
  })

})

//更新用户信息（完善列表）
router.post('/update', function (req, res) {
  //得到请求的cookie
  const userid = req.cookies.userid
  console.log(req)
  if (!userid) {
    return res.send({ code: 1, msg: '当前未登陆，请先登录' })
  }
  //用户已经存在
  const user = req.body
  UserModel.findByIdAndUpdate({ _id: userid }, user, function (err, oldUser) {
    if (!oldUser) {
      res.clearCookie(userid)
      return res.send({ code: 1, msg: '请重新登录' })
    }
    //合并用户信息，此次传入的值为头像等，还需要加上用户名、类型等一起返回
    const { _id, username, type } = oldUser
    const data = Object.assign(user, { _id, username, type })
    // assign(obj1, obj2, obj3,...) // 将多个指定的对象进行合并 , 返回一个合并后的对象
    res.send({ code: 0, data })
  })

})

//获取用户数据（利用cookie）
router.get('/user', function (req, res) {
  const userid = req.cookies.userid
  if (!userid) {
    return res.send({ code: 1, msg: '请先登录' })
  } else {
    UserModel.findOne({ _id: userid }, filter, function (err, user) {
      if (user === null) {
        // res.clearCookie(userid)
        // console.log(res.cookie.userid)
        return res.send({ code: 2, msg: '请先注册' })
      }
      return res.send({ code: 0, data: user })
    })
  }
})

//获取指定类型用户列表
router.get('/userlist', function (req, res) {
  const { type } = req.query
  UserModel.find({ type }, filter, function (err, user) {
    if (err) {
      return res.send({ code: 1, msg: '获取错误' })
    } else {
      res.send({ code: 0, data: user })
    }
  })
})

//获取当前用户所有相关聊天信息列表
router.get('/msglist', function (req, res) {
  const userid = req.cookies.userid //得到发起查询请求的用户
  // 查询得到所有 user 文档数组
  UserModel.find(function (err, userDocs) {
    // 用对象存储所有 user 信息 : key 为 user 的 _id, val 为 name 和 header 组成的 user 对象
    // 方便查找时直接用属性值点出来，而不必使用数组循环遍历
    const users = {}
    userDocs.forEach(doc => {
      users[doc._id] = { username: doc.username, header: doc.header }
    })
/*
  查询 userid 相关的所有聊天信息
  参数 1: 查询条件(只要是与当前发起请求用户有关的msg都要返回)
  参数 2: 过滤条件
  参数 3: 回调函数
*/
    ChatModel.find({'$or': [{From: userid}, {To: userid}]}, filter, function(err, chatMsg){
      // 返回包含所有用户和当前用户相关的所有聊天消息的数据
      res.send({code:0, data:{users, chatMsg}})
    })
  })
})

//修改指定消息为已读
router.post('/readmsg', function(req, res){
  const From = req.body.From
  const To = req.cookies.userid
/*
更新数据库中的 chat 数据
参数 1: 查询条件
参数 2: 更新为指定的数据对象
参数 3: 是否 1 次更新多条 , 默认只更新一条
参数 4: 更新完成的回调函数
*/
  // ChatModel.find({To, From,read: false},function(err, doc){
  //   console.log(doc)
  // })
  ChatModel.update({To, From,read: false}, {read:true}, {multi:true}, function(err, doc){
    if(err){
      return res.send({code:1, msg:'查询失败'})
    }
    res.send({code: 0, data: doc.nModified}) // 更新的数量
  })
})

module.exports = router;
