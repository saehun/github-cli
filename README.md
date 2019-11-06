# github-cli
Github cli for public, personal use

## Table of Contents

1.  [Documentation](#documentation)
    1.  [Installation](#installation)

## Goals


## Usage

### Installation

``` shell
npm install -g @minidonut/github-cli
```

### Initialization

설치 디렉토리에 상태파일(.githubState)이 생성된다. 설정값, 토큰 등이 저장되며 `reset` 커맨드로 다시 초기화 할 수 있다.

``` shell
github init
```

``` shell
github reset
```

### Configuration

```shell
github config API_TOKEN=[api-token]
```

``` shell
github config repo=[repository]
> origin: [origin-id]
> upstream: [upstream-id]
```

Default origin과 upstream을 설정하기
``` shell
github config origin=[origin-id]
github config upstream=[upstream-id]
```


설정된 값을 확인
``` shell
github config
```

값을 삭제

``` shell
github config API_TOKEN=nil
```

값을 변경하고 싶으면 다시 설정 커맨드를 실행하면 된다.

### Command

``` shell
github alias salesboost-web=sw
```


``` shell
github pr-wait-squash [repo-name]
```


``` shell
github dev-to-master [repo-name]
```
