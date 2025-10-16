const roleMiddleware = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    // req.user.role can be: populated object with { name }, an ObjectId, or a string name
    const userRoleName = req.user.role && req.user.role.name ? req.user.role.name : undefined;
    const userRoleId = req.user.role && req.user.role._id ? String(req.user.role._id) : undefined;
    const userRoleRaw = typeof req.user.role === "string" ? req.user.role : undefined;

    const isAllowed = rolesArray.some((allowed) => {
      // Support comparing by name or by id
      return (
        allowed === userRoleName ||
        allowed === userRoleRaw ||
        (userRoleId && String(allowed) === userRoleId)
      );
    });

    if (!isAllowed) {
      return res.status(403).json({ success: false, message: "Forbidden: Access denied" });
    }

    next();
  };
};

module.exports = roleMiddleware;