# github-cli
Github cli for public, personal use

## Table of Contents

1.  [Documentation](#documentation)
    1.  [Installation](#installation)

## Goals
Karl Saehun Chung 3:01 AM
우선, jira-cli를 좀 고쳐서

Karl Saehun Chung 3:01 AM
티켓생기고난 번호가지고 바로 체크아웃할 수 있도록 했음
그리고 github-cli를 만들었는데 커맨드가 총 네개임
yo, ho, hou 그리고 yohohou

Karl Saehun Chung 3:02 AM
yo는 현재 디렉토리에있는 깃 브랜치를 가지고 오리진에 푸쉬한다음 지라티켓 타이틀을 받아와서 upstream으로 풀리퀘 생성하는거고

Karl Saehun Chung 3:02 AM
ho는 그 풀리퀘 3초컷으로 폴링하면서 conflict있는지 그리고 circleCI통과하는지 검사하는거고.
이때 circleCI 스테이트는 노란색 초록색 빨간색으로 실시간 변함 터미널에서
hou는 풀리퀘 머지하고 origin 브랜치 삭제하고 로컬브랜치 삭제하고 지라티켓 삭제하고 dev로 돌아와서 풀다시 받고 남은 jira이슈 보여주는것 까지
그래서 합치면 yohohou. 이건 위 세개 전부다 하는거
짜잘한 수정요청있을때 upstream dev따온 상태에서 지라티켓생성, 수정, 커밋, 푸쉬, 풀리퀘, 머지, 티켓삭제, 브랜치삭제가
원터치로!!


## Usage

### Installation

``` shell
npm install -g @minidonut/github-cli

or

git clone git@github.com:minidonut/github-cli.git
cd github-cli && yarn install
yarn build
yarn link

echo "export GITHUB_ACCESS_TOKEN=[github access token]" >> ~/.bashrc
```
