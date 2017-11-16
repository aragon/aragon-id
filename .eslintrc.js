module.exports = {
    "extends": "standard",
    "rules": {
        "comma-dangle": ["off"],
        "indent": ["error", 4],
        "quotes": ["error", "double", { "avoidEscape": true }],
        "space-before-function-paren": ["error", { "anonymous": "always", "named": "never", "asyncArrow": "always" }],
    }
}
