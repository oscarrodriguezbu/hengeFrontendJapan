import { useEffect, useReducer } from 'react';
import type { CSSProperties, Dispatch, SetStateAction } from 'react';

interface CreateUserFormProps {
  setUserWasCreated: Dispatch<SetStateAction<boolean>>;
}

type State = {
  username: string;
  password: string;
  criteriaErrors: string[];
  apiError: string;
  passwordTouched: boolean;
};

type Action =
  | { type: 'SET_USERNAME'; payload: string }
  | { type: 'SET_PASSWORD'; payload: string }
  | { type: 'SET_CRITERIA_ERRORS'; payload: string[] }
  | { type: 'SET_API_ERROR'; payload: string }
  | { type: 'SET_PASSWORD_TOUCHED'; payload: boolean };

const initialState: State = {
  username: '',
  password: '',
  criteriaErrors: [],
  apiError: '',
  passwordTouched: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_USERNAME':
      return { ...state, username: action.payload };
    case 'SET_PASSWORD':
      return { ...state, password: action.payload };
    case 'SET_CRITERIA_ERRORS':
      return { ...state, criteriaErrors: action.payload };
    case 'SET_API_ERROR':
      return { ...state, apiError: action.payload };
    case 'SET_PASSWORD_TOUCHED':
      return { ...state, passwordTouched: action.payload };
    default:
      return state;
  }
}

const urlSignUp: string = 'https://api.challenge.hennge.com/password-validation-challenge-api/001/challenge-signup';
const authToken: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsib3hrYXI5OTFAaG90bWFpbC5jb20iXSwiaXNzIjoiaGVubmdlLWFkbWlzc2lvbi1jaGFsbGVuZ2UiLCJzdWIiOiJjaGFsbGVuZ2UifQ.cGTUOgp0ayc4g_AMzuM4n6pSrDQ8fmMVqN5FNo9eRrk';

function CreateUserForm({ setUserWasCreated }: CreateUserFormProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { username, password, criteriaErrors, apiError, passwordTouched } = state;

  useEffect(() => {
    const handler = setTimeout(() => {
      if (passwordTouched) validatePassword(password);
    }, 400);

    return () => clearTimeout(handler);
  }, [password, passwordTouched]);

  const validatePassword = (pwd: string): boolean => {
    const errors: string[] = [];

    if (pwd.length < 10) errors.push('Password must be at least 10 characters long');
    if (pwd.length > 24) errors.push('Password must be at most 24 characters long');
    if (/\s/.test(pwd)) errors.push('Password cannot contain spaces');
    if (!/[0-9]/.test(pwd)) errors.push('Password must contain at least one number');
    if (!/[A-Z]/.test(pwd)) errors.push('Password must contain at least one uppercase letter');
    if (!/[a-z]/.test(pwd)) errors.push('Password must contain at least one lowercase letter');

    dispatch({ type: 'SET_CRITERIA_ERRORS', payload: errors });
    return errors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: 'SET_API_ERROR', payload: '' });
    dispatch({ type: 'SET_CRITERIA_ERRORS', payload: [] });

    const isPasswordValid = validatePassword(password);

    if (!username || !isPasswordValid) return;

    try {
      const res = await fetch(urlSignUp, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        setUserWasCreated(true);
        return;
      }

      const contentType = res.headers.get('content-type');

      if (res.status === 401 || res.status === 403) {
        dispatch({ type: 'SET_API_ERROR', payload: 'Not authenticated to access this resource.' });
      } else if (res.status === 400) {
        dispatch({ type: 'SET_API_ERROR', payload: 'Something went wrong, please try again.' });
      } else if (res.status === 422 && contentType?.includes('application/json')) {
        extractBackendErrors(res);
      } else {
        dispatch({ type: 'SET_API_ERROR', payload: 'Something went wrong, please try again.' });
      }
    } catch (err) {
      dispatch({ type: 'SET_API_ERROR', payload: 'Something went wrong, please try again.' });
    }
  };

  const extractBackendErrors = async (res: Response) => {
    const data = await res.json();
    const backendErrors: string[] = data.errors || [];

    const mappedErrors = backendErrors.map((err) => {
      switch (err) {
        case 'too_short':
          return 'Password must be at least 10 characters long';
        case 'too_long':
          return 'Password must be at most 24 characters long';
        case 'no_whitespace':
          return 'Password cannot contain spaces';
        case 'missing_digits':
          return 'Password must contain at least one number';
        case 'missing_uppercase':
          return 'Password must contain at least one uppercase letter';
        case 'missing_lowercase':
          return 'Password must contain at least one lowercase letter';
        case 'not_allowed':
          dispatch({ type: 'SET_API_ERROR', payload: 'Sorry, the entered password is not allowed, please try a different one.' });
          return null;
        default:
          return null;
      }
    }).filter(Boolean) as string[];

    dispatch({ type: 'SET_CRITERIA_ERRORS', payload: mappedErrors });
  }

  return (
    <div style={formWrapper}>
      <form style={form} onSubmit={handleSubmit} noValidate>
        <label htmlFor="username" style={formLabel}>Username</label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="new-password"
          style={formInput}
          value={username}
          onChange={(e) => dispatch({ type: 'SET_USERNAME', payload: e.target.value })}
          aria-invalid={!username && apiError ? 'true' : 'false'}
        />

        <label htmlFor="password" style={formLabel}>Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          style={formInput}
          value={password}
          onChange={(e) => {
            dispatch({ type: 'SET_PASSWORD', payload: e.target.value });
            if (!passwordTouched) dispatch({ type: 'SET_PASSWORD_TOUCHED', payload: true });
          }}
          aria-invalid={criteriaErrors.length > 0 ? 'true' : 'false'}
        />

        {/* Client-side validation */}
        {passwordTouched && criteriaErrors.length > 0 && (
          <ul style={errorList}>
            {criteriaErrors.map((err, idx) => (
              <li key={idx} style={errorText}>{err}</li>
            ))}
          </ul>
        )}

        {/* API Error*/}
        {apiError && <p style={apiErrorStyle}>{apiError}</p>}

        <button type="submit" style={formButton}>Create User</button>
      </form>
    </div>
  );
}

export { CreateUserForm };

const formWrapper: CSSProperties = {
  maxWidth: '500px',
  width: '80%',
  backgroundColor: '#efeef5',
  padding: '24px',
  borderRadius: '8px',
};

const form: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const formLabel: CSSProperties = {
  fontWeight: 700,
};

const formInput: CSSProperties = {
  outline: 'none',
  padding: '8px 16px',
  height: '40px',
  fontSize: '14px',
  backgroundColor: '#f8f7fa',
  border: '1px solid rgba(0, 0, 0, 0.12)',
  borderRadius: '4px',
};

const formButton: CSSProperties = {
  outline: 'none',
  borderRadius: '4px',
  border: '1px solid rgba(0, 0, 0, 0.12)',
  backgroundColor: '#7135d2',
  color: 'white',
  fontSize: '16px',
  fontWeight: 500,
  height: '40px',
  padding: '0 8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: '8px',
  alignSelf: 'flex-end',
  cursor: 'pointer',
};

const errorText: CSSProperties = {
  color: 'red',
  fontSize: '13px',
};

const errorList: CSSProperties = {
  margin: '8px 0',
  paddingLeft: '16px',
};

const apiErrorStyle: CSSProperties = {
  color: '#d32f2f',
  fontWeight: 500,
  marginTop: '4px',
};
