<template>
  <div class="not-found">
    <h1>404</h1>
    <p>页面不存在</p>
    <router-link to="/">返回首页</router-link>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  text-align: center;
}

h1 {
  font-size: 4rem;
  color: #667eea;
}

p {
  font-size: 1.5rem;
  color: #666;
  margin-bottom: 2rem;
}

a {
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
}
</style>
