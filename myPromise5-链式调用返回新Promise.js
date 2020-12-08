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
                            // 注意这里是resolve，当前rejected状态的Promise被解决后，是不会影响新的Promise状态的，新的Promise状态默认是成功的
                            resolve(ret)
                        }
                    } catch(e) {
                        reject(e)
                    }
                }) 
            }
        })
    }
}