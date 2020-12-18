# 手写代码实现Promise之二

在[上一篇文章](./README.md)已经实现了基本的`Promise`，这里将继续实现其他`Promise`的方法。

- `Promise.prototype.then` ✅
- `Promise.prototype.catch`✅
- `Promise.prototype.finally`
- `Promise.resolve`
- `Promise.reject`
- `Promise.all`
- `Promise.race`
- `Promise.allSettled`
- `Promise.any`



## `finally`方法

之前学习了`Promise`的两个公有方法`then`和`catch`方法，现在来看第三个公有方法`finally`。

用法：`finally(callback)`

对于`finally`方法有两个注意点：一是callback回调参数不接受任何参数，二是`finally`方法会传递原来的值。如下面的例子。

```javascript
Promise.resolve('test').finally(() => {
    console.log('finally')
    return 'finally test'
}).then(res => {
    console.log('success: ' + res)
})
// finally
// success: test

```

可以看到，`finally`中回调函数返回了`'finally test'`，是没什么卵用的。事实上`finally`方法保留了原有的结果值，并且传递给下一个`Promise`。

它的实现方式很简单，如下

```javascript
finally(callback) {
  if (typeof callback !== 'function') {
    callback = () => {}
  }
  return this.then(
    res => new MyPromise(resolve => resolve(callback())).then(() => res),
    err => new MyPromise(resolve => resolve(callback())).then(() => { throw err })
  )
}
```

因为我们还没实现`MyPromise.resolve`方法，不然可改成

```javascript
finally(callback) {
  if (typeof callback !== 'function') {
    callback = () => {}
  }
  return this.then(
    res => MyPromise.resolve(callback()).then(() => res),
    err => MyPromise.resolve(callback()).then(() => { throw err })
  )
}
```

至此，`MyPromise`的三个公有方法都已实现，接下来就是静态方法的实现。



## resolve方法

`reoslve`方法的实现也比较简单，如下。

```javascript
static resolve(value) {
  return new MyPromise(resolve => resolve(value))
}
```

测试一下，很ok

```javascript
MyPromise.resolve('test').then(res => console.log('success: ' + res));
console.log('同步')
// 同步
// success: test
```

等等，这样就完成了吗？再用其他例子测试一下

```javascript
// ---例子1---
Promise.resolve(
    new Promise((resolve) => resolve('test'))
).then(res => {
    console.log('success: ' + res)
})
// success: test

MyPromise.resolve(
    new MyPromise((resolve) => resolve('test'))
).then(res => {
    console.log('success: ' + res)
})
// success: [object Object]

// ---例子2---
let thenable = {
    then: function(resolve, reject) {
      resolve('test');
    }
};
Promise.resolve(thenable).then(res => {
    console.log('success: ' + res)
})
// success: test

MyPromise.resolve(thenable).then(res => {
    console.log('success: ' + res)
})
// success: [object Object]
```

发现不对劲啊，与原生`Promise`还是有些区别。学习了[ECMAScript 6 入门](https://es6.ruanyifeng.com/#docs/promise#Promise-resolve)，发现`Promise.resolve`方法对不同参数的处理是不一样的。

1. **参数是一个`Promise`实例**，直接返回这个实例。
2. **参数是一个具有`then`方法的对象**，将这个对象转为`Promise`对象，然后立即执行`thenable`对象的`then`方法。
3. **参数是一个原始值，或者是一个不具有`then`方法的对象**，返回一个新的`Promise`对象，状态为`resolved`
4. **不带有任何参数**，直接返回一个`resolved`状态的`Promise`对象。

因此要改一下`resolve`方法

```javascript
static resolve(value) {
  if (value instanceof MyPromise) {
    return value
  }

  if (value instanceof Object && typeof value.then === 'function') {
    return new MyPromise(value.then)
  }

  return new MyPromise(resolve => resolve(value))
}
```

测试一下之前的例子，就木问题了。等一下，再等一下，看下面

```javascript
let thenable = {
    then: function(resolve, reject) {
        console.log(1)
        resolve('test');
        console.log(2)
    }
};
Promise.resolve(thenable).then(res => {
    console.log('success: ' + res)
})
Promise.resolve('3').then(res => {
    console.log('success: ' + res)
})
console.log(4)
// 4
// 1
// 2
// success: 3
// success: test


MyPromise.resolve(thenable).then(res => {
    console.log('success: ' + res)
})
MyPromise.resolve('3').then(res => {
    console.log('success: ' + res)
})
// 1
// 2
// 4
// success: test
// success: 3
```

`thenable`对象的`then`方法应该后于同步代码执行。因此最后对`resolve`方法改一下

```javascript
static resolve(value) {
  if (value instanceof MyPromise) {
    return value
  }

  if (value instanceof Object && typeof value.then === 'function') {
    return MyPromise.resolve().then(() => new MyPromise(value.then))
  }

  return new MyPromise(resolve => resolve(value))
}
```

至此，总算是对`MyPromise.resolve`方法封装好了。



## `reject`方法

`reject`方法比较简单，不需要像`resolve`方法那样条件判断。

```javascript
static reject(value) {
  return new MyPromise((_, reject) => reject(value))
}
```



## `all`方法

`Promise.all()`方法接受一个数组作为参数，如果数组的元素不是`Promise`实例，就会调用`Promise.resolve`方法，将其转为 Promise 实例，再进一步处理。

现在来实现一下。

```javascript
static all(promises) {
  if (!Array.isArray(promises)) {
    throw new TypeError('it is not a array')
  }

  return new MyPromise((resolve, reject) => {
    let len = promises.length
    let total = len
    let result = []

    function resolver(i, value) {
      result[i] = value
      // 数组中所有Promise实例都处理完，则可以改变新MyPromise的状态
      if (--total === 0) {
        resolve(result)
      }
    }

    for (let i = 0; i < len; i++) {
      // 只要有一个实例的状态是失败，那么新MyPromise就是失败
      MyPromise.resolve(promises[i]).then(value => resolver(i, value), reject)
    }
  })
}
```

可以尝试测试一下木有问题。事实上，`Promise.all()`方法的参数不一定要接受数组，但必须具有`Iterator`接口。

我们知道，默认具有`Iterator`接口的数据结构有

- Array
- Set
- Map
- String
- TypedArray
- 函数的arguments对象
- NodeList对象

我们可以使用**扩展运算符**对具有`Iterator`接口的数据结构转换为数组

```javascript
let arr = [...iterable];
```

那么我们可以对`Promise.all()`方法改一下，如下。

```javascript
static all(promises) {
  if (typeof promises[Symbol.iterator] !== 'function') {
    throw new TypeError(promises + ' is not iterable')
  }

  return new MyPromise((resolve, reject) => {
    promises = [...promises]

    let len = promises.length
    let total = len
    let result = []

    if (len === 0) {
      resolve(result)
    } else {
      function resolver(i, value) {
        result[i] = value
        // 数组中所有Promise实例都处理完，则可以改变新MyPromise的状态
        if (--total === 0) {
          resolve(result)
        }
      }

      for (let i = 0; i < len; i++) {
        // 只要有一个实例的状态是失败，那么新MyPromise就是失败
        MyPromise.resolve(promises[i]).then(value => resolver(i, value), reject)
      }
    }
  })
}
```

测试一下，没有问题

```javascript
MyPromise.all([1, 2]).then(res => console.log(res))
// [1, 2]

MyPromise.all([
  MyPromise.resolve('1'), 
  MyPromise.resolve('2')
])
.then(res => console.log(res))
// [1, 2]

MyPromise.all('12').then(res => console.log(res))
// ["1", "2"]

MyPromise.all(new Set([1, MyPromise.resolve(2)])).then(res => console.log(res))
// [1, 2]

MyPromise.all(new Map([['1', 1]])).then(res => console.log(res))
// [["1", 1]]

MyPromise.all(document.getElementsByTagName('body')).then(res => console.log(res))
// [body]
```



## `race`方法

`race`方法和`all`方法类似，就直接来写

```javascript
static race(promises) {
  if (typeof promises[Symbol.iterator] !== 'function') {
    throw new TypeError(promises + ' is not iterable')
  }
  return new MyPromise((resolve, reject) => {
    // 具有Iterator接口的数据结构都可以用for...of循环来遍历
    for (let promise of promises) {
      MyPromise.resolve(promise).then(resolve, reject)
    }
  })
}
```



## `allSettled`方法

> 该方法在 ES2020 引入

其实`all`、`race`、`allSettled`、`any`方法接受的参数一样，处理方式都是类似的，只是对结果的处理不一致。`allSettled`方法要求的是所有数组中的参数实例都返回结果后，该方法包装返回的实例才会结束，并且结果最终都会是`fulfilled`。那么直接来实现

```javascript
static allSettled(promises) {
  if (typeof promises[Symbol.iterator] !== 'function') {
    throw new TypeError(promises + ' is not iterable')
  }

  promises = [...promises]

  return new MyPromise((resolve) => {
    let len = promises.length
    let total = len
    let result = []

    function resolver(i) {
      return function(value) {
        result[i] = { status: MyPromise.FULFILLED, value }
        // 当所有实例都处理完
        if (--total === 0) {
          resolve(result)
        }
      }
    }
    function rejecter(i) {
      return function(reason) {
        result[i] = { status: MyPromise.REJECTED, reason }
        if (--total === 0) {
          resolve(result)
        }
      }
    }

    for (let i = 0; i < len; i++) {
      MyPromise.resolve(promises[i]).then(resolver(i), rejecter(i))
    }
  })
}
```

测试一下，木问题

```javascript
let arr = [
    new MyPromise(resolve => {
        setTimeout(() => resolve(1), 100)
    }),
    new MyPromise((resolve, reject) => {
        setTimeout(() => reject(2), 500)
    })
]
MyPromise.allSettled(arr).then(res => {
    console.log(res)
})
console.log('同步')

// 同步
// [{"status":"fulfilled","value":1},{"status":"rejected","reason":2}]
```





## `any`方法

> 该方法在ES2021 引入

该方法同样接受一组`Promise`实例，包装一个新的`Promise`实例返回。只要有一个实例成功，那么新的`Promise`实例状态变为`fulfilled`；如果所有实例都失败，则为`rejected`。`rejected`状态时抛出的错误是一个`AggregateError`实例。

```javascript
static any(promises) {
  if (typeof promises[Symbol.iterator] !== 'function') {
    throw new TypeError(promises + ' is not iterable')
  }

  promises = [...promises]


  return new MyPromise((resolve, reject) => {
    let len = promises.length
    let total = len
    let result = []

    function rejecter(i) {
      return function(reason) {
        result[i] = reason
        if (--total === 0) {
          reject(new AggregateError(result, 'All promises were rejected'))
        }
      }
    }

    for (let i = 0; i < len; i++) {
      MyPromise.resolve(promises[i]).then(resolve, rejecter(i))
    }
  })
}
```

测试一下

```javascript
let resolved = MyPromise.resolve('success')
let rejected = MyPromise.reject(1)
let alsoRejected = MyPromise.reject(2)

MyPromise.any([rejected, resolved, alsoRejected]).then(res => {
  console.log(res)
})
// success

MyPromise.any([rejected, alsoRejected]).catch(res => {
  console.log(res)
  console.log(res.errors)
})
// AggregateError: All promises were rejected
// [1, 2]
```

致此，把所有`Promise`方法都实现了。



## 总结

通过这一波学习，对`Promise`有了更好的理解。

事实上最终封装出来的`MyPromise`与原生`Promise`还是有本质的区别，比如说：

```javascript
// 例I
setTimeout(() => {
    console.log(2)
})
Promise.resolve(1).then(res => console.log(res))

// 例II
setTimeout(() => {
    console.log(2)
})
MyPromise.resolve(1).then(res => console.log(res))
```

如果了解了事件队列，我们都知道例I应该输出1—>2。我们希望例II也应和例I一样，可没想到，例II输出的却是2—>1。这是应为我们封装的`MyPromise`是基于`setTimeout`来实现异步的。而原生`Promise`中，一个`promise`就是一个`PromiseJob`，放入`Job Queue`，它的处理是和`Event Loop Queue`区分开的。



参考资料

[https://github.com/huanshen/Promise](https://github.com/huanshen/Promise)

[https://es6.ruanyifeng.com](https://es6.ruanyifeng.com)

[https://www.zhihu.com/question/57071244](https://www.zhihu.com/question/57071244)
