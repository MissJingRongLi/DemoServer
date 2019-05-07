// 1.引包
const mongoose = require('mongoose')
const md5 = require('blueimp-md5')

// 2.连接数据库，这个数据库可以不存在，当向其中插入数据时会自动创建
mongoose.connect('mongodb://localhost/test')

// 2.1测试是否连接成功
// const conn = mongoose.connection
// conn.on('connected', function(){
//     console.log("hello")
// })

 
//3 创建schema
//3.1 定义
const userSchema = mongoose.Schema({
    username:{type:String, require:true},
    password:{type:String, require:true},
    type:{type:String, require:true},
})
// 3.2发布模型
const UserModel = mongoose.model('user', userSchema) //集合名会自动转为 Users

// 4 增删改查
function testSave(){
    const userModel = new UserModel({
        username:'zhangsan',
        password:md5('123'),
        type:'employee'
    })
    userModel.save(function(err, userDoc){
        console.log(err + "---" + userDoc)
    })
}
testSave()