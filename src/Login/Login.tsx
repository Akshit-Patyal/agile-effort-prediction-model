import React, { useState } from "react";
import { Button, Form } from "react-bootstrap";
import { useNavigate } from "react-router";
import "./Login.scss";

const Login = () => {
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [userNameValid, setUserNameValid] = useState(true);
  const [passwordValid, setPasswordValid] = useState(true);

  const navigate = useNavigate();

  /**
   * @method userNameValidation
   * @description userName validations requirements: name must not be empty. name should have email like format...eg- akshit@123.com or akshit.patyal@123.com.
   * @param {React.ChangeEvent<HTMLInputElement>} ev
   */
  const userNameValidation = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const val = ev.target.value;
    const regex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i;
    if (!isNaN(+val) && val.length === 10) {
      setUserNameValid(true);
    } else if (val.length === 0) {
      setUserNameValid(false);
    } else if (regex.test(val)) {
      setUserNameValid(true);
    } else {
      setUserNameValid(false);
    }
    setUserName(val);
  };

  /**
   * @method passwordValidation
   * @description password validation requirements: Minimum six characters, at least one uppercase letter, one lowercase letter, one number and one special character.
   * @param {React.ChangeEvent<HTMLInputElement>} ev
   */
  const passwordValidation = () => {
    const val = password;
    const regex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
    if (val.length === 0) {
      setPasswordValid(false);

      return false;
    } else if (regex.test(val)) {
      setPasswordValid(true);

      return true;
    } else {
      setPasswordValid(false);

      return false;
    }
  };

  const loginHandler = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    event.preventDefault();
    if (userNameValid && passwordValidation()) {
      navigate("/dashboard");
    }
  };

  return (
    <div className="login-container">
      <div className="form-container">
        <div className="form-comp">
          <h1>Sign In</h1>
          <Form className="form-data">
            <Form.Group className="form-floating mb-3">
              <Form.Control
                type="email"
                placeholder="Email or phone number"
                id="floatingEmail"
                value={userName}
                onChange={userNameValidation}
              />
              <Form.Label htmlFor="floatingEmail">
                Email or phone number
              </Form.Label>
              {!userNameValid && (
                <span className="user-valid">
                  Please enter a valid email address or phone number.
                </span>
              )}
            </Form.Group>
            <Form.Group className="form-floating mb-3">
              <Form.Control
                type="password"
                placeholder="Password"
                id="floatingPassword"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordValid(true);
                }}
              />
              <Form.Label htmlFor="floatingPassword">Password</Form.Label>
              {!passwordValid && (
                <span className="pass-valid text-start">
                  Please enter correct password.
                </span>
              )}
            </Form.Group>
            <Button onClick={loginHandler} className="mt-4">
              Login
            </Button>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default Login;
