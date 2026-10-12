def create_guest(fname:str, lname:str, phone:str, email:str) -> Guest:
    if fname and lname and phone and email:
        Guest.objects.create(
            fname=fname,
            lname=lname,
            phone=phone,
            email=email,
        )
        return "Created"
    else:
        raise ValidationError("No Field must be empty")