# "Try Storage" CLI Tool

This CLI tool is built to test the capacity and read/write speeds of a storage medium.
I use this to check if I bought a fake SD card or SSD stick.

## Usage

Perform storage trials under the given directory `./dir`.

```Shell
try-storage ./dir
```

### Options

Run `try-storage` without any arguments to print all available options.

**`--chunk-size`**

Set size of each chunk to 5mb:

```Shell
try-storage --chunk-size 5 ./dir
```

By default the chunk size is 30mb.

**`--chunks`**

Write at most 10 chunks, or until the space is exhausted:

```Shell
try-storage --chunks 10 ./dir
```

By default there is no upper limit.
