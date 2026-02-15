interface Window {
  google?: typeof google;
}

declare namespace google.accounts.id {
  interface CredentialResponse {
    credential: string;
    select_by: string;
  }

  interface GsiButtonConfiguration {
    theme?: 'outline' | 'filled_blue' | 'filled_black';
    size?: 'large' | 'medium' | 'small';
    width?: number;
    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
    shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  }

  function initialize(config: {
    client_id: string;
    callback: (response: CredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    ux_mode?: 'popup' | 'redirect';
    login_uri?: string;
  }): void;

  function renderButton(
    parent: HTMLElement,
    options: GsiButtonConfiguration,
  ): void;

  function prompt(): void;
  function disableAutoSelect(): void;
}
