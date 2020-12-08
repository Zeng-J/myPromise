# 手写代码实现Promise

## 基础例子

我们先实现一个基础的`Promise`。

```javascript
class MyPromise {
    static PENDING = 'pending'
    static FULFILLED = 'fulfilled'
    static REJECTED = 'rejected'

    constructor(executor) {
        this.state = MyPromise.PENDING
        this.result = undefined

        executor(this.resolve.bind(this), this.reject.bind(this))
    }

    resolve(value) {
        this.state = MyPromise.FULFILLED
        this.result = value
    }
    reject(value) {
        this.state = MyPromise.REJECTED
        this.result = value
    }

    then(onFulfilled, onRejected) {
        if (this.state === MyPromise.FULFILLED) {
            onFulfilled(this.result)
        }
        if (this.state === MyPromise.REJECTED) {
            onRejected(this.result)
        }
    }
}

new MyPromise((resolve, reject) => resolve('test'))
  .then(res => console.log('success: ' + res))
// success: test

new MyPromise((resolve, reject) => reject('test'))
  .then(
  	res => console.log('result: ' + res), 
  	err => console.log('error: ' + err)
	)
// error: test
```

当我们`new`一个`MyPromise`，用then接受结果时，好像是没有问题的。看下面的代码，`then`接受的回调函数先于同步代码执行了。

```javascript
new MyPromise((resolve, reject) => resolve('test'))
  .then(res => console.log('success: ' + res))
  
console.log('同步')

// success: test
// 同步
```

这不符合预期啊，`then`中回调函数应该是异步执行的，因此我们需要改一下`then`方法。

```javascript
then(onFulfilled, onRejected) {
  if (this.state === MyPromise.FULFILLED) {
    setTimeout(() => onFulfilled(this.result))
  }
  if (this.state === MyPromise.REJECTED) {
    setTimeout(() => onRejected(this.result)) 
  }
}
```

此时再来执行之前的例子，就没有问题了。

```javascript
new MyPromise((resolve, reject) => resolve('test'))
  .then(res => console.log('success: ' + res))
  
console.log('同步')

// 同步
// success: test
```



## 存放回调函数的数组

我们知道`new`一个`MyPromise`时，其回调函数是立即执行的。前面我们的例子`new MyPromise((resolve, reject) => resolve('test'))`，都是立即改变`promise`状态。

但是我们改变一下代码，如下面例子，发现没有打印出结果。这是因为我们把`resolve`放在`setTimeout`中异步执行，当执行`then`的时候，`MyPromise`实例的状态还是`pending`，因此没能够执行`onFulfilled`回调函数。

```javascript
new MyPromise((resolve, reject) => {
  setTimeout(() => resolve('test'))
}).then(res => {
  console.log('success: ' + res)
})
// 没有打印出结果
```

怎么解决这个问题呢？我们把`then`接受的回调函数存放在一个数组里，等`promise`状态改变后，把这个数组拿出来遍历执行一边即可。

```javascript
class MyPromise {
    static PENDING = 'pending'
    static FULFILLED = 'fulfilled'
    static REJECTED = 'rejected'

    constructor(executor) {
        this.state = MyPromise.PENDING
        this.result = undefined
        this.callbacks = []

        executor(this.resolve.bind(this), this.reject.bind(this))
    }

    assign(value, state) {
      	// 若状态已经改变，不可再更改
      	if (this.state !== MyPromise.PENDING) {
            return
        }
        this.state = state
        this.result = value
        for (let callback of this.callbacks) {
            if (state === MyPromise.FULFILLED) {
                callback.onFulfilled(this.result)
            } else {
                callback.onRejected(this.result)
            }
        }
        this.callbacks = []
    }

    resolve(value) {
        this.assign(value, MyPromise.FULFILLED)
    }
    reject(value) {
        this.assign(value, MyPromise.REJECTED)
    }

    then(onFulfilled, onRejected) {
        if (this.state === MyPromise.PENDING) {
            this.callbacks.push({
                onFulfilled,
                onRejected
            })
        }
        if (this.state === MyPromise.FULFILLED) {
            setTimeout(() => onFulfilled(this.result))
        }
        if (this.state === MyPromise.REJECTED) {
            setTimeout(() => onRejected(this.result)) 
        }
    }
}

new MyPromise((resolve, reject) => resolve('test'))
  .then(res => console.log('success: ' + res))

console.log('同步')

// 同步
// success: test
```

通过上面的事例，我们进一步完善了`MyPromise`的封装。

## 错误捕获

我们知道原生`Promise`在未改变状态前，发现代码出错，会将状态变为`rejected`。而目前我们封装的`MyPromise`还未实现这个功能，直接报错了。

```javascript
new MyPromise((resolve, reject) => {
    console.log(a);
    resolve('test');
}).then(
    res => console.log('success: ' + res), 
    err => console.log('error: ' + err)
)
  
console.log('同步')
VM17693:2 Uncaught ReferenceError: a is not defined
    at <anonymous>:2:17
    at new MyPromise (<anonymous>:11:9)
    at <anonymous>:1:1
```

我们对`contructor`构造器的中`executor`函数进行`try catch `。

```javascript
constructor(executor) {
  this.state = MyPromise.PENDING
  this.result = undefined
  this.callbacks = []

  try {
    executor(this.resolve.bind(this), this.reject.bind(this))
  } catch(e) {
    this.result = e
    this.state = MyPromise.REJECTED
  }
}
```

此时再对上一个例子进行测试就木问题了。

```javascript
new MyPromise((resolve, reject) => {
    console.log(a);
    resolve('test');
}).then(
    res => console.log('success: ' + res), 
    err => console.log('error: ' + err)
)
console.log('同步')
// 同步
// error: ReferenceError: a is not defined
```

## 链式调用

我们知道，原生`Promise`是可以实现链式调用，也即可以一直用点操作符执行then或catch。下面对`then`方法进行更改，让它返回一个新的`MyPromise`。

```javascript
then(onFulfilled, onRejected) {
  return new MyPromise((resolve, reject) => {
    if (this.state === MyPromise.PENDING) {
      this.callbacks.push({
        onFulfilled: (value) => {
          try {
            let ret = onFulfilled(value)
            resolve(ret)
          } catch(e) {
            reject(e)
          }
        },
        onRejected: (value) => {
          try {
            let ret = onRejected(value)
            // 注意这里是resolve，当前rejected状态的Promise被解决后，是不会影响新的Promise状态的，新的Promise状态默认是成功的
            resolve(ret)
          } catch(e) {
            reject(e)
          }
        }
      })
    }
    if (this.state === MyPromise.FULFILLED) {
      setTimeout(() => {
        try {
          let ret = onFulfilled(this.result)
          resolve(ret)
        } catch(e) {
          reject(e)
        }
      })
    }
    if (this.state === MyPromise.REJECTED) {
      setTimeout(() => {
        try {
          let ret = onRejected(this.result)
          // 注意这里是resolve
          resolve(ret)
        } catch(e) {
          reject(e)
        }
      }) 
    }
  })
}
```

测试一下，看来是实现了。

```javascript
new MyPromise((resolve, reject) => {
    resolve('test');
})
    .then(res => {
        console.log('success: ' + res)
        return 'test2'
    })
    .then(res => {
        console.log('success2: ' + res)
    })
// success: test
// success: test2
```



## 链式调用返回新Promise

我们知道`then`可以返回一个新的`Promise`实例

```javascript
new Promise((resolve, reject) => {
    resolve('test');
})
    .then(res => {
        console.log('success: ' + res)
        return new Promise((resolve, reject) => reject('error'))
    })
    .then(res => {
        console.log('success2: ' + res)
    }, err => console.log('error2: ' + err))

// success: test
// error2: error

// 我们封装的MyPromise
new MyPromise((resolve, reject) => {
    resolve('test');
})
    .then(res => {
        console.log('success: ' + res)
        return new MyPromise((resolve, reject) => reject('error'))
    })
    .then(res => {
        console.log('success2: ' + res)
    }, err => console.log('error2: ' + err))

// success: test
// success2: [object Object]
```

如上面的例子可以看到，我们没有对返回值是`Promise`实例时做出正确的处理，现在我们来处理一下

```javascript
then(onFulfilled, onRejected) {
  return new MyPromise((resolve, reject) => {
    if (this.state === MyPromise.PENDING) {
      this.callbacks.push({
        onFulfilled: (value) => {
          try {
            let ret = onFulfilled(value)
            if (ret instanceof MyPromise) {
              ret.then(resolve, reject)
            } else {
              resolve(ret)
            }
          } catch(e) {
            reject(e)
          }
        },
        onRejected: (value) => {
          try {
            let ret = onRejected(value)
            if (ret instanceof MyPromise) {
              ret.then(resolve, reject)
            } else {
              // 注意这里是resolve，当前rejected状态的Promise被解决后，是不会影响新的Promise状态的，新的Promise状态默认是成功的
              resolve(ret)
            }
          } catch(e) {
            reject(e)
          }
        }
      })
    }
    if (this.state === MyPromise.FULFILLED) {
      setTimeout(() => {
        try {
          let ret = onFulfilled(this.result)
          if (ret instanceof MyPromise) {
            ret.then(resolve, reject)
          } else {
            resolve(ret)
          }
        } catch(e) {
          reject(e)
        }
      })
    }
    if (this.state === MyPromise.REJECTED) {
      setTimeout(() => {
        try {
          let ret = onRejected(this.result)
          if (ret instanceof MyPromise) {
            ret.then(resolve, reject)
          } else {
            // 注意这里是resolve
            resolve(ret)
          }
        } catch(e) {
          reject(e)
        }
      }) 
    }
  })
}
```

我们再测试一下之前的例子，就很ok。

```javascript
new MyPromise((resolve, reject) => {
    resolve('test');
})
    .then(res => {
        console.log('success: ' + res)
        return new MyPromise((resolve, reject) => reject('error'))
    })
    .then(res => {
        console.log('success2: ' + res)
    }, err => console.log('error2: ' + err))

// success: test
// error2: error
```



## 抽取then方法的重复代码

其实`then`方法中很多代码是重复的，我们来抽取一下。

```javascript
doNext(fun, value, resolve, reject) {
  try {
    let ret = fun(value)
    if (ret instanceof MyPromise) {
      ret.then(resolve, reject)
    } else {
      // 注意这里是resolve，当前rejected状态的Promise被解决后，是不会影响新的Promise状态的，新的Promise状态默认是成功的
      resolve(ret)
    }
  } catch(e) {
    reject(e)
  }  
}

then(onFulfilled, onRejected) {
  return new MyPromise((resolve, reject) => {
    if (this.state === MyPromise.PENDING) {
      this.callbacks.push({
        onFulfilled: (value) => {
          this.doNext(onFulfilled, value, resolve, reject)
        },
        onRejected: (value) => {
          this.doNext(onRejected, value, resolve, reject)
        }
      })
    }
    if (this.state === MyPromise.FULFILLED) {
      setTimeout(() => {
        this.doNext(onFulfilled, this.result, resolve, reject)
      })
    }
    if (this.state === MyPromise.REJECTED) {
      setTimeout(() => {
        this.doNext(onRejected, this.result, resolve, reject)
      })
    }
  })
}
```



## 穿透

我们知道原生`then`方法是支持穿透的，如下面的例子

```javascript
new Promise((resolve, reject) => {
    resolve('test');
})
    .then()
    .then(
        res => console.log('success: ' + res),
        err => console.log('error: ' + err)
    )
// success: test

new Promise((resolve, reject) => {
    reject('test');
})
    .then()
    .then(
        res => console.log('success: ' + res),
        err => console.log('error: ' + err)
    )
// error: test
```

那我们对自己的`MyPromise`来实现这个功能，也就是说我们要对`then`方法接受的回调函数进行判断处理，修改的地方并不多。

```javascript
then(onFulfilled, onRejected) {
  if (typeof onFulfilled !== 'function') {
    onFulfilled = value => value
  }
  if (typeof onRejected !== 'function') {
    onRejected = value => {
      throw value
    }
  }

  return new MyPromise((resolve, reject) => {
    // 省略代码...
  })
}
```

至此，我们算是完成了对`then`方法的实现。

## 实现catch方法

我们知道`catch`方法和`then`方法的第二个参数一样，都是接受失败状态返回的结果。`catch`的封装特别简单。

```javascript
catch(onRejected) {
  return this.then(null, onRejected)
}
```

## 小结

至此，算是实现了一个简版的`Promise`，之后再对`Promise`其他进行封装。通过这次的学习，稍稍加深了对`Promise`的理解，如存在有误，欢迎提出。

代码链接[https://github.com/Zeng-J/myPromise](https://github.com/Zeng-J/myPromise)

参考资料

[https://github.com/huanshen/Promise](https://github.com/huanshen/Promise)

[https://github.com/then/promise](https://github.com/then/promise)
