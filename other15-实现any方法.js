class MyPromise {
    static PENDING = 'pending'
    static FULFILLED = 'fulfilled'
    static REJECTED = 'rejected'

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
        if (typeof onFulfilled !== 'function') {
            onFulfilled = value => value
        }
        if (typeof onRejected !== 'function') {
            onRejected = value => {
                throw value
            }
        }

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

    catch(onRejected) {
        return this.then(null, onRejected)
    }

    finally(callback) {
        if (typeof callback !== 'function') {
            callback = () => {}
        }
        return this.then(
            res => MyPromise.resolve(callback()).then(() => res),
            err => MyPromise.resolve(callback()).then(() => { throw err })
        )
    }

    static resolve(value) {
        if (value instanceof MyPromise) {
            return value
        }

        if (value instanceof Object && typeof value.then === 'function') {
            return MyPromise.resolve().then(() => new MyPromise(value.then))
        }

        return new MyPromise(resolve => resolve(value))
    }

    static reject(value) {
        return new MyPromise((_, reject) => reject(value))
    }

    static all(promises) {
        // if (!Array.isArray(promises)) {
        //     throw new TypeError('it is not a array')
        // }

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

    static race(promises) {
        if (typeof promises[Symbol.iterator] !== 'function') {
            throw new TypeError(promises + ' is not iterable')
        }
        return new MyPromise((resolve, reject) => {
            for (let promise of promises) {
                MyPromise.resolve(promise).then(resolve, reject)
            }
        })
    }

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
}
