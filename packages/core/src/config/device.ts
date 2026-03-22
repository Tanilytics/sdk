export function getDeviceType(){
 return /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop';   
}