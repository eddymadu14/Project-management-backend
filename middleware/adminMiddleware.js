
const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) next();
  else res.status(403).json({ message: 'Not authorized as admin' });
};

//allow roles
const allowRoles = (...roles)=>{
  return (req, res, next)=>{
    if (roles.includes(req.user.roles)){
      next();
    } else {
      res.status(403);
      throw new Error(`Access denied: require role [${roles.join(',')}]`)
    }
  }
}


// export default admin;
export {admin, allowRoles};