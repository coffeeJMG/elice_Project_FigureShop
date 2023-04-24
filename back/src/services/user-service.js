const userModel = require("../db/models/user-model");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

class UserService {
  // 회원가입
  async addUser(userInfo) {
    const { email, fullName, password, phoneNumber, address } = userInfo;

    // 이메일 중복 확인
    const user = await userModel.findByEmail(email);
    if (user) {
      const err = new Error(
        "이 이메일은 현재 사용중입니다. 다른 이메일을 입력해 주세요."
      );
      err.status = 403;
      throw err;
    }

    // 비밀번호 해쉬화(암호화)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 전달받은 값을 가지고 새로운 user 정보를 생성
    const newUserInfo = {
      full_name: fullName,
      email,
      password: hashedPassword,
      phone_number: phoneNumber,
      address: {
        postal_code: address.postalCode,
        address_main: address.addressMain,
        address_detail: address.addressDetail,
      },
    };

    // db에 저장
    const createdNewUser = await userModel.create(newUserInfo);

    return createdNewUser;
  }

  // 로그인
  async getUserToken(loginInfo) {
    // 객체 destructuring
    const { email, password } = loginInfo;

    // 우선 해당 이메일의 사용자 정보가  db에 존재하는지 확인
    const user = await userModel.findByEmail(email);
    if (!user) {
      const err = new Error(
        "해당 이메일은 가입 내역이 없습니다. 다시 한 번 확인해 주세요."
      );
      err.status = 404;
      throw err;
    }

    // 비밀번호 일치 여부 확인
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      const err = new Error(
        "비밀번호가 일치하지 않습니다. 다시 한 번 확인해 주세요."
      );
      err.status = 401;
      throw err;
    }

    // 로그인 성공 -> JWT 웹 토큰 생성
    const secretKey = process.env.JWT_SECRET_KEY || "secret";

    // user_id, role을 jwt 토큰에 담음
    const token = jwt.sign({ userId: user._id, role: user.role }, secretKey);

    return { token };
  }

  // 모든 유저 목록
  async getUsers() {
    const users = await userModel.findAll();

    return users;
  }

  // 유저 상세 조회
  async getUserById(userId) {
    const user = await userModel.findById(userId);

    return user;
  }

  // 유저정보 수정, 현재 비밀번호가 있어야 수정 가능함.
  async setUser(userInfoRequired, toUpdate) {
    const { userId, currentPassword } = userInfoRequired;

    // userId값을 가진 유저가 db에 있는지 확인
    let user = await userModel.findById(userId);

    // db에서 찾지 못한 경우, 에러 메시지 반환
    if (!user) {
      const err = new Error("가입 내역이 없습니다. 다시 한 번 확인해 주세요.");
      err.status = 404;
      throw err;
    }

    // 비밀번호 일치 여부 확인
    const isPasswordCorrect = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isPasswordCorrect) {
      const err = new Error(
        "현재 비밀번호가 일치하지 않습니다. 다시 한 번 확인해 주세요."
      );
      err.status = 401;
      throw err;
    }

    // 비밀번호도 변경하는 경우에는, 회원가입 때처럼 해쉬화 해주어야 함.
    const { password } = toUpdate;

    if (password) {
      const newPasswordHash = await bcrypt.hash(password, 10);
      toUpdate.password = newPasswordHash;
    }

    // 업데이트 진행
    user = await userModel.update({
      userId,
      update: toUpdate,
    });

    return user;
  }
}

const userService = new UserService(userModel);

module.exports = userService;
