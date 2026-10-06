interface Window {
  nuvoriDesktop?: { platform: 'windows'; signIn: (authorizeUrl: string) => Promise<string> };
}
