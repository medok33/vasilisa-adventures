export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; returnTo?: string }> }) {
  const params = await searchParams;
  return <main className="login-shell">
    <section className="login-card">
      <div className="login-star">★</div>
      <p className="login-kicker">Личное пространство</p>
      <h1>Приключения Василисы</h1>
      <p>Войди, чтобы открыть задания, дневник и копилку.</p>
      {params.error && <div className="login-error" role="alert">Логин или пароль не подошли</div>}
      <form action="/api/auth/login" method="post">
        <input type="hidden" name="returnTo" value={params.returnTo ?? "/"} />
        <label><span>Логин</span><input name="username" autoComplete="username" required maxLength={100} /></label>
        <label><span>Пароль</span><input name="password" type="password" autoComplete="current-password" required maxLength={200} /></label>
        <button type="submit">Войти</button>
      </form>
    </section>
  </main>;
}
