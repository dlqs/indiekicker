
const checkUsernameAvail = (username) => {
    $.get('usernamecheck/' + username, (data) => {
        console.log(data)
        return data
    })
}