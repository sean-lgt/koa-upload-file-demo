const Koa = require('koa');
const fs = require('fs');
const path = require('path');
const router = require('koa-router')();
const koaBady = require('koa-body');
const static = require('koa-static');
const send = require('koa-send'); //实现文件下载
const mime = require('mime-types'); //返回图片类型
const cors = require('koa2-cors');
const archiver = require('archiver');
const app = new Koa();
const CryptoJS = require("crypto-js");
const {
  Base64
} = require('js-base64')
/* 
  koa-body 对应的API及使用 看这篇文章 http://www.ptbird.cn/koa-body.html
  或者看 github上的官网 https://github.com/dlau/koa-body
*/
app.use(cors());
app.use(koaBady({
  multipart: true, //支持文件上传
  formidable: {
    maxFieldsSize: 5 * 1024 * 1024, //最大为5
    multipart: true,
  }
}))
// 处理跨域
app.use(async (ctx, next) => {
  ctx.set("Access-Control-Allow-Origin", "*")
  await next()
})

app.use(static(path.join(__dirname, 'pubilc')));

router.get('/', (ctx) => {
  ctx.set("Content-Type", "application/json");
  ctx.body = {
    url: "aaaa",
    code: 0,
    message: "上传成功"
  }
})

// flag 是否为多文件上传
const uploadFilePublic = function(ctx, files, flag) {
  const uploadUrl = "http://127.0.0.1:3002/upload/";
  const filePath = path.join(__dirname, '/pubilc/upload')
  let file = '';
  let fileReader = '';
  let fileResource = '';
  let writeStream = '';
  const fileFunc = function(file) {
    //读取文件流
    fileReader = fs.createReadStream(file.path);
    //组装成绝对路径
    const fileName = new Date().getTime() + `${file.name}`;
    const fileResource = filePath + fileName;
    // 使用 createWriteStream 写入数据，然后使用管道流 pipe 拼接
    const writeStream = fs.createWriteStream(fileResource);
    fileReader.pipe(writeStream);
  };
  const returnFunc = function(flag) {
    console.log(flag);
    console.log(files);
    if (flag) {
      let url = '';
      for (let i = 0; i < files.length; i++) {
        const fileName = new Date().getTime() + `${files[i].name}`;
        url += uploadUrl + fileName;
      }
      url = url.replace(/,$/gi, "");
      ctx.body = {
        url: url,
        code: 0,
        message: '上传成功'
      };
    } else {
      const fileName = new Date().getTime() + `${files.name}`;
      ctx.body = {
        url: uploadUrl + fileName,
        code: 0,
        message: '上传成功'
      };
    }
  };

  if (flag) {
    // 多个文件上传
    for (let i = 0; i < files.length; i++) {
      const f1 = files[i];
      fileFunc(f1);
    }
  } else {
    fileFunc(files);
  }

  // 判断 /static/upload 文件夹是否存在，如果不在的话就创建一个
  if (!fs.existsSync(filePath)) {
    fs.mkdir(filePath, (err) => {
      if (err) {
        throw new Error(err);
      } else {
        returnFunc(flag);
      }
    });
  } else {
    returnFunc(flag);
  }
}

// 支持多文件上传
router.post('/upload', (ctx) => {
  ctx.set("Content-Type", "application/json")
  let files = ctx.request.files.file;
  const fileArrs = [];
  if (files.length === undefined) {
    // 上传单个文件，它不是数组，只是单个的对象
    uploadFilePublic(ctx, files, false);
  } else {
    uploadFilePublic(ctx, files, true);
  }
})

router.get('/downloadFile/:name', async (ctx) => {
  console.log("请求下载")
  const name = ctx.params.name;
  console.log(ctx.params.name)
  const path = `pubilc/upload/${name}`
  console.log('aaa', path)
  ctx.attachment(path);
  await send(ctx, path)
})
router.post('/downFileXLS', async (ctx) => {
  ctx.set("Content-Type", "application/json")
  ctx.body = {
    success: true,
    data: {
      flieName: 'abc.xlsx'
    }

  }
})
// 多文件上传
router.post('/upload01', (ctx) => {
  const uploadUrl = "http://127.0.0.1:3002/upload/";
  ctx.set("Content-Type", "application/json")
  // console.log("file",ctx.request.files.file)
  const file = ctx.request.files.file;
  //读取文件流
  const fileReader = fs.createReadStream(file.path);
  const filePath = path.join(__dirname, './pubilc/upload/');
  console.log('路劲', filePath);
  //组装成绝对路径
  const fileName = new Date().getTime() + `${file.name}`;
  const fileResource = filePath + fileName;
  console.log("生成的文件名路径", fileResource)

  // 使用 createWriteStream 写入数据，然后使用管道流 pipe 拼接
  const writeStream = fs.createWriteStream(fileResource);
  //需要判断文件是否存在，不存在则创建
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(filePath, (err) => {
      if (err) {
        throw new Error(err);
      } else {
        fileReader.pipe(writeStream);
        ctx.body = {
          url: uploadUrl + fileName,
          code: 0,
          message: "上传成功"
        }
      }
    })
  } else {
    fileReader.pipe(writeStream);
    ctx.body = {
      url: uploadUrl + fileName,
      code: 0,
      message: "上传成功"
    }
  }
})

router.get('/downloadAllFiles', async (ctx) => {
  // 将要打包的文件列表
  // const list = [{name:''},{name:''}];
  // const zipName = 'upload文件.zip';
  // const zipStream = fs.createWriteStream(zipName);
  // const zip = archiver('zip');
  //打包整个文件夹
  console.log("批量下载")
  const zipStream = fs.createWriteStream('test.zip')
  const zip = archiver('zip');
  zip.pipe(zipStream);
  zip.directory('pubilc/upload/');
  zip.finalize();
  ctx.attachment(zipName);
  await send(ctx, zipName);
});

router.get('/sendImgFile', async (ctx) => {
  console.log("被调用了")
  let filePath = path.join(__dirname, './pubilc/upload/1615962159705电子档案版本02-02.png')
  let file = null;
  try {
    file = fs.readFileSync(filePath); // 读取文件
  } catch (err) {
    // 如果不存在则直接返回
    return ctx.body = '系统异常'
  }
  let mimeType = mime.lookup(filePath); // 读取图片文件类型
  console.log("图片文件类型", mimeType)
  ctx.set('content-type', mimeType); // 设置返回类型
  ctx.body = file; //返回图片
});
router.post('/uploadIMG/:filename', async (ctx) => {
  console.log("请求接口图片")
  const name = ctx.params.filename;
  let filePath = path.join(__dirname, `/pubilc/upload/${name}`)
  console.log(">>>", filePath)
  ctx.attachment(filePath);
  await send(ctx, filePath);
})
router.get('/SGYIMG/:filename', async (ctx) => {
  console.log("请求接口图片>>>>")
  const name = ctx.params.filename;
  let filePath = path.join(__dirname, `/pubilc/imgTest/${name}`)
  try {
    file = fs.readFileSync(filePath); // 读取文件
  } catch (err) {
    // 如果不存在则直接返回
    return ctx.body = '系统异常'
  }
  let mimeType = mime.lookup(filePath); // 读取图片文件类型
  console.log("图片文件类型", mimeType)
  ctx.set('content-type', mimeType); // 设置返回类型
  ctx.body = file; //返回图片
})
router.get('/messageTest', (ctx) => {
  ctx.set("Content-Type", "application/json")
  ctx.body = {
    success: false,
    resultCode: '0009E',
    errorMessage: "报错了"
  }
})


router.get('/wechat/getUserDonate', (ctx) => {
  ctx.set("Content-Type", "application/json")
  ctx.body = {
    success: true,
    stepCount: 10003,
    moneyCount: 200,
    donateList: [{
        time: '活动期间累计',
        value: '捐赠12600步',
        prize: '3元大乐透代金券',
        id: '23423',
      },
      {
        time: '2021-03-29 19:37:33',
        value: '捐赠12600步',
        prize: '3元大乐透代金券',
        id: '23423',
      },
      {
        time: '2021-03-29 19:37:33',
        value: '捐赠12600步',
        prize: '',
        id: '23423',
      }, {
        time: '2021-03-29 19:37:33',
        value: '捐赠12600步',
        prize: '3元大乐透代金券',
        id: '23423',
      }, {
        time: '2021-03-29 19:37:33',
        value: '捐赠12600步',
        prize: '',
        id: '23423',
      }, {
        time: '2021-03-29 19:37:33',
        value: '捐赠12600步',
        prize: '3元大乐透代金券',
        id: '23423',
      },
      {
        time: '2021-03-29 19:37:33',
        value: '捐赠12600步',
        prize: '3元大乐透代金券',
        id: '23423',
      }
    ]
  }
})


router.get('/getIPDetail/:id', (ctx) => {
  ctx.set("Content-Type", "application/json")
  ctx.body = {
    success: true,
    data: {
      rows: [{
        date: '2021-05-12',
        ip: '113.66.251.168',
        phone: '17815966854',
        weixinID: '123456',
        answerTime: '2021-05-12 11:00:00',
        lotteryTime: '2021-05-12 11:03:00',
        money: '10',
        desc: '123456'
      }],
      total: 50
    }
  }
})
router.get('/getStoreNoDetail/:id', (ctx) => {
  ctx.set("Content-Type", "application/json")
  ctx.body = {
    success: true,
    data: {
      rows: [{
        date: '2021-05-12',
        ip: '113.66.251.168',
        phone: '17815966854',
        weixinID: '123456',
        answerTime: '2021-05-12 11:00:00',
        lotteryTime: '2021-05-12 11:03:00',
        money: '10',
        desc: '123456'
      }],
      total: 30
    }
  }
})


router.get('/wechat/verCode/checkCaptcha', (ctx) => {
  let req_query = ctx.request.query;
  const data = Base64.decode(JSON.stringify(ctx.request.query.a))
  console.log("【提交数据】", data)
  ctx.set("Content-Type", "application/json")
  ctx.body = {
    "success": true,
    "data": {
      "status": 'OK',
      "codeInfo": 'aa',
      "code": req_query
    }
  }
})

app.use(router.routes());
app.use(router.allowedMethods());
// 
app.listen(3002, '192.168.137.1', () => {
  console.log('server is listen in 3002');
});