/// 简单 token 估算：按字符数 / 4 进行粗略估算
pub fn estimate_tokens(text: &str, _model: &str) -> i32 {
    let chars = text.chars().count() as i32;
    (chars + 3) / 4
}
